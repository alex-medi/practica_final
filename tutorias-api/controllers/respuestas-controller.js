const Joi = require('joi');
const fs = require('fs');
const path = require('path');

const { database } = require('../infraestructure');

async function responderPregunta(req, res) {
    try{
     const { preguntaId } = req.params;
     const { id, experto } = req.auth;
     const { captura } = req.file
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

      fs.writeFileSync(path.join('capturas', 'respuesta-' + req.auth.id + '.jpg'), req.file.buffer)
       captura = 'http://localhost:8080/static/respuesta-' + req.auth.id + '.jpg'
           
        
     //3. Insertar la respuesta
     const [respuesta] = await database.pool.query('INSERT INTO respuestas (descripcion, id_experto, id_pregunta) VALUES (?, ?, ?)', [descripcion,id,preguntaId]);
   
       const {insertId} = respuesta;

       //Recuerda que aqui estas enviando la imagen despues de crear la respuesta (prueba a ir cambiando, esta linea de lugar)
       fs.writeFileSync(path.join('capturas', 'pregunta-' + insertId + '.jpg'), req.file.buffer)
       captura = 'http://localhost:8080/static/pregunta-' + insertId + '.jpg'

       //4. Ponemos la pregunta como contestada

       const respondida = 1;
       await database.pool.query('UPDATE preguntas SET respondida = ? WHERE id = ?', [respondida, preguntaId]);

       //5. Mostramos la pregunta 
       const [ask] = await database.pool.query('SELECT * FROM respuestas WHERE id = ?', insertId);
       res.status(201);
       res.send(ask[0]);
   
     
    }catch(err){
     res.status(err.code || 500);
     console.log(err)
     res.send(err.message );
   
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
      const [respuesta] = await database.pool.query('SELECT * FROM respuestas WHERE id_pregunta = ?', preguntaId);
      res.send(respuesta);
    
    }catch(err){
      res.status(err.code || 500);
      res.send(err.message );
    
    }
}
module.exports = {
    responderPregunta,
    getRespuestasBypreguntasId
    
  };