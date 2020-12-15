const Joi = require('joi');

const { database } = require('../infraestructure')

//Funcion que obtiene las tematicas
async function getTematicas(req, res) {
    try {
      const [tematicas] = await database.pool.query('SELECT * FROM tematicas');
      res.send(tematicas);
    } catch (err) {
      res.status(500);
      res.send({ error: err.message });
    }
  }
  
  //buscar por tematica
  async function getTematicasBynombre(req, res) {
    try {
      // validamos que el nombre es correcto
      const { nombre } = req.params;
      const schema = Joi.string();
      await schema.validateAsync(nombre);
           
      const [rows] = await database.pool.query('SELECT * FROM tematicas WHERE nombre = ?', nombre);
  
      if (!rows || !rows.length) {
        // devolvemos 404 Not Found si no encontramos el user en base de datos.
        res.status(404);
  
        return res.send({ error: 'tematica no encontrada' });
      }
      
      return res.send(rows[0]);
  
    } catch (err) {
      // enviamos el error al cliente
      res.status(400);
      res.send({ error: err.message });
    }
  }
  


  module.exports = {
    getTematicas,
    getTematicasBynombre,
    
  };