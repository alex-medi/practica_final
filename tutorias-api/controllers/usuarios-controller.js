const Joi = require('joi');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const { database } = require('../infraestructure');

//Funcion que obtiene todos los usuarios
async function getusuariosById(req, res) {
  try {
    // validamos que el nombre es correcto
    const { id } = req.params;
    const schema = Joi.number();
    await schema.validateAsync(id);
         
    const [rows] = await database.pool.query('SELECT * FROM usuarios WHERE id = ?', id);

    if (!rows || !rows.length) {
      // devolvemos 404 Not Found si no encontramos el user en base de datos.
      res.status(404);

      return res.send({ error: 'usuario no encontrado' });
    }
    
    return res.send(rows[0]);

  } catch (err) {
    // enviamos el error al cliente
    res.status(400);
    res.send({ error: err.message });
  }
}

//Función para crear un usuario
async function createUsuario(req, res) {
         
            
    try {
      
      const { nombre, email, login, password, experto, empresa } = req.body;
  
      const userSchema = Joi.object({
        nombre: Joi.string().required(),
        email: Joi.string().email().required(),
        login: Joi.string().required(),
        password: Joi.string().min(8).max(20).required(),
        experto: Joi.boolean().required(),
        empresa: Joi.string()
      });
      //validar la entrada (body)
      await userSchema.validateAsync({ nombre, email, login, password, experto });
          
      const [users] = await database.pool.query('SELECT * FROM usuarios WHERE email = ?', email);
      //comprobar si existe el email que viene en el body
      if (users.length) {
        const err = new Error('Ya existe un usuario con ese email');
        //si existe, devolvemos 409
        err.code = 409;
        throw err;
      }
      //comprobar si existe el login del usuario
      const [logins] = await database.pool.query('SELECT * FROM usuarios WHERE login = ?', login);

      if (logins.length) {
        const err = new Error('Ya existe un usuario con este login');
        err.code = 409;
        throw err;
      }
  
      const passwordHash = await bcrypt.hash(password, 10);
      //insertar el usuario en bbdd (con la password encriptada)
      const [rows] = await database.pool.query('INSERT INTO usuarios (nombre, email, login, password, experto, empresa) VALUES (?, ?, ?, ?, ?, ?)', [nombre, email, login, passwordHash, experto, empresa]);
  
      const createdId = rows.insertId;
      //devolver usuario creado
      const [selectRows] = await database.pool.query('SELECT * FROM usuarios WHERE id = ?', createdId);
  
      res.send(selectRows[0]);
  
    } catch (err) {
      res.status(err.code || 500);
      res.send(err.message );
    }
  }

  async function login(req, res) {
    try {
      const { email, password }= req.body;
  
      const schema = Joi.object({
        email: Joi.string().email().required(),
        password: Joi.string().min(8).max(20).required(),
      });
  
      await schema.validateAsync({ email, password });
  
      // 1. Recuperamos el usuario desde la base de datos.
            
      const [rows] = await database.pool.query('SELECT * FROM usuarios WHERE email = ?', email);
  
      if (!rows || !rows.length) {
        const error = new Error('El email es incorrecto');
        error.code = 404;
        throw error;
      }
  
      const user = rows[0];
  
      // 2. Comprobamos que el password que nos están enviando es válido.
  
      const isValidPassword = await bcrypt.compare(password, user.password);
  
      if (!isValidPassword) {
        const error = new Error('La contraseña es incorrecta');
        error.code = 401;
        throw error;
      }
  
      // 3. Construimos el JWT para enviárselo al cliente.
      const tokenPayload = { id: user.id };

      //Hacer aqui un if para que confirme si el usuario es experto o no
  
      const token = jwt.sign(
        tokenPayload,
        process.env.JWT_SECRET,
        { expiresIn: '30d' },
      );
      
      res.send({ token, login: user.login, id: user.id, empresa: user.empresa, experto: user.experto, nombre: user.nombre });
  
    } catch (err) {
      res.status(err.code || 500);
      res.send({ error: err.message });
    }
  }

  //borrar usuario
  async function deleteUsuario(req, res) {
    try {
      const { id } = req.params;
      const [usuarios] = await database.pool.query('SELECT * FROM usuarios WHERE id = ?', id);
      //comprobar que el usuario existe
      if (!usuarios.length) {
        res.status(404);
        return res.send({ error: 'Usuario no encontrado' });
      }
          
       
      await database.pool.query('DELETE FROM usuarios WHERE id = ?', id);
  
      res.status(204);
      res.send();
    } catch (err) {
      res.status(500);
      res.send({ error: err.message });
    }
  }

  async function modifyUsuario(req, res) {
    try {
      // validamos los datos de entrada.
      
      const { id } = req.params;
      let schema = Joi.number().positive().required();
      await schema.validateAsync(id);
  
      const { login, password, experto, empresa } = req.body;
  
      schema = Joi.object({
        login: Joi.string().required(),
        password: Joi.string().min(8).max(20).required(),
        experto: Joi.boolean().required(),
        empresa: Joi.string()
      });
  
      await schema.validateAsync({ login, password, experto, empresa });
  
      //se busca el usuario a modificar
      
      const [rows] = await database.pool.query('SELECT * FROM usuarios WHERE id = ?',id);
  
      if (!rows || !rows.length) {
        res.status(404);
        return res.send({ error: 'Usuario no encontrado' });
      }
      
      const passwordHash = await bcrypt.hash(password, 10);
      // modificar el usuario en la base de datos
      
      await database.pool.query('UPDATE usuarios SET login = ?, password = ?, experto = ?, empresa = ? WHERE id = ?', [login, passwordHash, experto, empresa, id]);
  
      // devolvemos el usuario modificado.
      
      const [selectRows] = await database.pool.query('SELECT * FROM usuarios WHERE id = ?', id);
  
      res.send(selectRows[0]);
    } catch (err) {
      res.status(400);
      res.send({ error: err.message });
    }
  }
     

  module.exports = {
    getusuariosById,
    createUsuario,
    login,
    deleteUsuario,
    modifyUsuario
  };