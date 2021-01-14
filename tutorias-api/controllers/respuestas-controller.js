const Joi = require('joi');
const fs = require('fs');
const path = require('path');

const { database } = require('../infraestructure');

async function responderPregunta(req, res) {
  try {
    const { preguntaId } = req.params;
    const { id, experto } = req.auth;
    let captura = req.file
    const { descripcion } = req.body;

    const Schema = Joi.object({

      descripcion: Joi.string().required(),

    });
    await Schema.validateAsync({ descripcion });

    if (!experto) {
      const err = new Error('El usuario no es experto');
      err.code = 409;
      throw err;
    }

    //comprobar si existe la pregunta
    const [pregunta] = await database.pool.query('SELECT * FROM preguntas WHERE id = ?', preguntaId);


    if (!pregunta.length) {
      const err = new Error('no existe esta pregunta');
      err.code = 409;
      throw err;
    }


    //3. Insertar la respuesta
    const [respuesta] = await database.pool.query('INSERT INTO respuestas (descripcion, id_experto, id_pregunta) VALUES (?, ?, ?)', [descripcion, id, preguntaId]);

    const { insertId } = respuesta;

    if (req.file) {
      fs.writeFileSync(path.join('capturas','respuesta-' + insertId + '.jpg'), captura.buffer);
      captura = 'http://localhost:8080/static/respuesta-' + insertId + '.jpg';
      await database.pool.query('UPDATE respuestas SET captura = ? WHERE id = ?', [captura, insertId]);
    }

    //4. Ponemos la pregunta como contestada

    const respondida = 1;
    await database.pool.query('UPDATE preguntas SET respondida = ? WHERE id = ?', [respondida, preguntaId]);

    //5. Mostramos la pregunta 
    const [ask] = await database.pool.query('SELECT * FROM respuestas WHERE id = ?', insertId);
    res.status(201);
    res.send(ask[0]);


  } catch (err) {
    res.status(err.code || 500);
    console.log(err)
    res.send(err.message);

  }

}

//Obtener respuestas por id de tematica
async function getRespuestasBypreguntasId(req, res) {
  try {

    const { preguntaId } = req.params;

    //comprobar si existe la pregunta
    const [pregunta] = await database.pool.query('SELECT * FROM respuestas WHERE id_pregunta = ?', preguntaId);

    if (!pregunta.length) {
      const err = new Error('no existe esta pregunta');
      err.code = 409;
      throw err;
    }
    //Aqui se seleccionan todas las respuestas de una pregunta          
    const [respuesta] = await database.pool.query('SELECT r.*, u.login,(select round(avg(rating),0) from puntuacion where id_respuesta = r.id) as rating FROM respuestas as r JOIN usuarios as u ON r.id_experto = u.id WHERE id_pregunta = ?', preguntaId);
    res.send(respuesta);

  } catch (err) {
    res.status(err.code || 500);
    res.send(err.message);

  }
}

async function createScore(req, res) {
  try{
    // 1. validar la entrada (body)
   const { respuestaId } = req.params;
   const { id } = req.auth;
   const { rating } = req.body;
 
   const userSchema = Joi.object({
           
     rating: Joi.number().max(5).min(1).required(),
     
   });
   await userSchema.validateAsync({ rating });
 
   //2. comprobar que existe la respuesta
   const [respuestas] = await database.pool.query('SELECT * FROM respuestas WHERE id = ?', respuestaId);
 
   if (!respuestas.length) {
     const err = new Error('No existe esta respuesta');
     err.code = 409;
     throw err;
   }
 
   //3. Insertar rating
   const [rows] = await database.pool.query('INSERT INTO puntuacion (rating, id_usuario, id_respuesta) VALUES (?, ?, ?)', [rating,id,respuestaId]);
 
     const {insertId} = rows;
 
     const [score] = await database.pool.query('SELECT * FROM puntuacion WHERE id = ?', insertId);
     res.status(201);
     res.send(score[0]);
 
   
  }catch(err){
   res.status(err.code || 500);
   res.send(err.message );
 
  }
  
}

module.exports = {
  responderPregunta,
  getRespuestasBypreguntasId,
  createScore,
  getRespuestasById

};