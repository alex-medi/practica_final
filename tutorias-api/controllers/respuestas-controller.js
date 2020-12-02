const Joi = require('joi');

const { database } = require('../infraestructure');

async function responderPregunta(req, res) {
    try{
     const { preguntaId } = req.params;
     const { id } = req.auth;
     
     const { descripcion } = req.body;
   
     const Schema = Joi.object({
              
        descripcion: Joi.string().required(),
        
     });
     await Schema.validateAsync({ descripcion });

     //comprobar si existe la pregunta
     const [pregunta] = await database.pool.query('SELECT * FROM preguntas WHERE id = ?', preguntaId);

      if (!pregunta.length) {
        const err = new Error('no existe esta pregunta');
        err.code = 409;
        throw err;
      }
             
        
     //3. Insertar la respuesta
     const [rows] = await database.pool.query('INSERT INTO respuestas (descripcion, id_experto, id_pregunta) VALUES (?, ?, ?)', [descripcion,id,preguntaId]);
   
       const {insertId} = rows;

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

module.exports = {
    responderPregunta,
    
  };