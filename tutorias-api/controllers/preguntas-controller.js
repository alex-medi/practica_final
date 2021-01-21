const Joi = require('joi');
const fs = require('fs');
const path = require('path');

const { database } = require('../infraestructure');

//crear pregunta
async function createPregunta(req, res) {
    try{
     //No es necesario poner aqui de momento el rol de usuario
     const { tematicaId } = req.params;
     const { id } = req.auth;
     let  captura  = req.file
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
     const [pregunta] = await database.pool.query('INSERT INTO preguntas (titulo, cuerpo, respondida, resuelta, id_usuario, id_tematica) VALUES (?, ?, ?, ?, ?, ?)', [titulo,cuerpo,respondida,resuelta,id,tematicaId]);
   
     const {insertId} = pregunta;
     if(req.file){
      fs.writeFileSync(path.join('capturas', 'pregunta-' + insertId + '.jpg'), captura.buffer);
      captura = 'http://localhost:8080/static/pregunta-' + insertId + '.jpg';
      await database.pool.query('UPDATE preguntas SET captura = ? WHERE id = ?', [captura,insertId]);
    }
           
              
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
      const [question] = await database.pool.query('SELECT p.*, u.login FROM preguntas as p JOIN usuarios as u ON p.id_usuario = u.id WHERE id_tematica = ? ORDER BY fecha_consulta desc',tematicaId);
      res.send(question);
    
    }catch(err){
      res.status(err.code || 500);
      res.send(err.message );
    
    }
}

//Obtener preguntas por palabras clave
async function getPreguntasByKey(req, res) {
  try {
    // validamos que lo que se ha escrito es correcto
    const { key } = req.params;
    const schema = Joi.string();
    await schema.validateAsync(key);
    const key2 = '%'+key+'%';
         
    const [clave] = await database.pool.query('SELECT * FROM preguntas WHERE titulo like ? or cuerpo like ?',[key2,key2]);
    
    if (!clave || !clave.length) {
      // devolvemos 404 Not Found si no lo encontramos en la en base de datos.
      res.status(404);

      return res.send({ error: 'la busqueda no produjo ningun resultado' });
    }
    
    return res.send(clave);

  } catch (err) {
    // enviamos el error al cliente
    res.status(400);
    res.send({ error: err.message });
  }
}

//Funcion que obtiene preguntas por id
async function getPreguntasById(req, res) {
  try {
    // validamos
    const { id } = req.params;
    const schema = Joi.number();
    await schema.validateAsync(id);
         
    const [rows] = await database.pool.query('SELECT p.*, u.login FROM preguntas as p JOIN usuarios as u ON p.id_usuario = u.id WHERE p.id = ?', id);

    if (!rows || !rows.length) {
      // devolvemos 404 Not Found si no le encontramos en base de datos.
      res.status(404);

      return res.send({ error: 'pregunta no encontrado'});
    }
    
    return res.send(rows[0]);

  } catch (err) {
    // enviamos el error al cliente
    res.status(400);
    res.send({ error: err.message });
  }
}

   module.exports = {
    createPregunta,
    getPreguntasBytematicaId,
    getPreguntasByKey,
    getPreguntasById
  };



  