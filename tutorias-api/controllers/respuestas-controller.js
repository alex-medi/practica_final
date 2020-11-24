const Joi = require('joi');

const { database } = require('../infraestructure');

async function responderPregunta(req, res) {
    try{
     
     const { id } = req.params;
     
     const { descripcion, id_usuario, id_pregunta } = req.body;
   
     const Schema = Joi.object({
              
        descripcion: Joi.string().required(),
        id_usuario: Joi.string().required(),
        id_pregunta: Joi.string().required(),
     });
     await Schema.validateAsync({ descripcion, id_usuario, id_pregunta });

     //comprobar si existe el usuario
     const [userId] = await database.pool.query('SELECT * FROM usuarios WHERE id = ?', id);

      if (!userId.length) {
        const err = new Error('no existe este usuario');
        err.code = 409;
        throw err;
      }
             
        
     //3. Insertar la respuesta
     const [rows] = await database.pool.query('INSERT INTO preguntas (descripcion, id_usuario, id_pregunta) VALUES (?, ?, ?,)', [descripcion,id_usuario,id_pregunta]);
   
       const {insertId} = rows;
   
       const [ask] = await database.pool.query('SELECT * FROM preguntas WHERE id = ?', insertId);
       res.status(201);
       res.send(ask[0]);
   
     
    }catch(err){
     res.status(err.code || 500);
     res.send(err.message );
   
    }
    
   
   }

module.exports = {
    responderPregunta,
    
  };