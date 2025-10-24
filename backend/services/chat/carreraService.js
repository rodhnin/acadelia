import pool from "../../lib/dbPool.js";

const createCarrera = async ({ nombre, descripcion, month, year, imagen }) => {
  if (!nombre) throw new Error("El nombre de la carrera es obligatorio");

  // Verificar si ya existe una carrera con este nombre
  const checkQuery = "SELECT id_carrera FROM carrera WHERE nombre = $1";
  const checkResult = await pool.query(checkQuery, [nombre]);
  
  if (checkResult.rows.length > 0) {
    throw new Error("Ya existe una carrera con este nombre");
  }

  // Obtener el siguiente ID disponible
  const nextIdQuery = "SELECT COALESCE(MAX(id_carrera), 0) + 1 AS next_id FROM carrera";
  const nextIdResult = await pool.query(nextIdQuery);
  const nextId = nextIdResult.rows[0].next_id;

  const query = `
    INSERT INTO carrera (id_carrera, nombre, descripcion, month, year, imagen)
    VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING *;
  `;
  const values = [nextId, nombre, descripcion, month, year, imagen];
  const { rows } = await pool.query(query, values);
  return rows[0];
};

const getAllCarreras = async () => {
  const query = "SELECT id_carrera, nombre, descripcion, month, year, imagen FROM carrera";
  const { rows } = await pool.query(query);
  return rows;
};

const getCarreraById = async (id_carrera) => {
  if (!id_carrera) throw new Error("El ID de la carrera es obligatorio");

  const query = `
    SELECT id_carrera, nombre, descripcion, month, year, imagen 
    FROM carrera 
    WHERE id_carrera = $1
  `;
  const { rows } = await pool.query(query, [id_carrera]);
  return rows[0];
};

const updateCarrera = async ({ id_carrera, nombre, descripcion, month, year, imagen }) => {
  if (!id_carrera) throw new Error("El ID de la carrera es obligatorio");
  if (!nombre) throw new Error("El nombre de la carrera es obligatorio");

  const query = `
    UPDATE carrera
    SET nombre = $1, descripcion = $2, month = $3, year = $4, imagen = $5
    WHERE id_carrera = $6
    RETURNING *;
  `;
  const values = [nombre, descripcion, month, year, imagen, id_carrera];
  const { rows } = await pool.query(query, values);
  return rows[0];
};

const deleteCarrera = async (id_carrera) => {
  if (!id_carrera) throw new Error("El ID de la carrera es obligatorio");

  const query = `
    DELETE FROM carrera 
    WHERE id_carrera = $1 
    RETURNING id_carrera, nombre, descripcion, month, year, imagen;
  `;
  const { rowCount } = await pool.query(query, [id_carrera]);

  if (rowCount === 0) throw new Error("No se encontró la carrera a eliminar.");
};

export { createCarrera, getAllCarreras, getCarreraById, updateCarrera, deleteCarrera };