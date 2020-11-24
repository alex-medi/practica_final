const Joi = require('joi');

const { database } = require('../infraestructure');

//crear pregunta
async function createPregunta(req, res) {
    try{
     
     const { id } = req.params;
     const { id } = req.auth;
     const { titulo,cuerpo } = req.body;
   
     const Schema = Joi.object({
               
       titulo: Joi.string().required(),
       cuerpo: Joi.string().required(),
     });
     await Schema.validateAsync({ titulo,cuerpo });

     //comprobar si existe el usuario
     const [userId] = await database.pool.query('SELECT * FROM usuarios WHERE id = ?', id);

      if (!userId.length) {
        const err = new Error('no existe este usuario');
        err.code = 409;
        throw err;
      }
             
        
     //3. Insertar la pregunta
     const [rows] = await database.pool.query('INSERT INTO preguntas (titulo, cuerpo,id_usuario) VALUES (?, ?, ?,)', [titulo,cuerpo,id]);
   
       const {insertId} = rows;
   
       const [ask] = await database.pool.query('SELECT * FROM preguntas WHERE id = ?', insertId);
       res.status(201);
       res.send(ask[0]);
   
     
    }catch(err){
     res.status(err.code || 500);
     res.send(err.message );
   
    }
    
   
   }
   
   //Obtener preguntas por temáticas
   async function getPreguntasBytematicaId(req, res) {
    try {
      
      const { tematicaId } = req.params;
                
      const [question] = await database.pool.query('SELECT * FROM etiquetas WHERE id_pregunta = ?',tematicaId);
      res.send(question[0]);
    
    }catch(err){
      res.status(err.code || 500);
      res.send(err.message );
    
    }
}

   module.exports = {
    createPregunta,
    getPreguntasBytematicaId,
    
  };