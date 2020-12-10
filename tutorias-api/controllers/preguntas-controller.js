const Joi = require('joi');

const { database } = require('../infraestructure');

//crear pregunta
async function createPregunta(req, res) {
    try{
     //No es necesario poner aqui de momento el rol de usuario
     const { tematicaId } = req.params;
     const { id } = req.auth;
     
     const { titulo,cuerpo } = req.body;
   
     const Schema = Joi.object({
               
       titulo: Joi.string().required(),
       cuerpo: Joi.string().required(),
     });
     await Schema.validateAsync({ titulo,cuerpo });

     //comprobar si existe la tematica
     const [tematica] = await database.pool.query('SELECT * FROM tematicas WHERE id = ?', tematicaId);

      if (!tematica.length) {
        const err = new Error('no existe esta tematica');
        err.code = 409;
        throw err;
      }
       const respondida = 0;
       const resuelta = 0;               
        
     //3. Insertar la pregunta
     const [rows] = await database.pool.query('INSERT INTO preguntas (titulo, cuerpo, respondida, resuelta, id_usuario, id_tematica) VALUES (?, ?, ?, ?, ?, ?)', [titulo,cuerpo,respondida,resuelta,id,tematicaId]);
   
       const {insertId} = rows;

       
       
       //4. Mostramos la pregunta
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

      //comprobar si existe la tematica
     const [tematica] = await database.pool.query('SELECT * FROM tematicas WHERE id = ?', tematicaId);

     if (!tematica.length) {
       const err = new Error('no existe esta tematica');
       err.code = 409;
       throw err;
     }
      //Aqui se selecciona por tematica          
      const [question] = await database.pool.query('SELECT * FROM preguntas WHERE id_tematica = ?',tematicaId);
      res.send(question);
    
    }catch(err){
      res.status(err.code || 500);
      res.send(err.message );
    
    }
}

   module.exports = {
    createPregunta,
    getPreguntasBytematicaId,
    
  };