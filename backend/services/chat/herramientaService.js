import pool from "../../lib/dbPool.js";

export async function obtenerHerramientas() {
  try {
    const resultado = await pool.query("SELECT * FROM herramienta");
    return resultado.rows;
  } catch (error) {
    throw new Error("Error al obtener las herramientas: " + error.message);
  }
}

export async function crearHerramienta({ nombre, descripcion, slug, imagen }) {
  if (!nombre) throw new Error("El nombre de la herramienta es obligatorio");

  try {
    const checkQuery = "SELECT id FROM herramienta WHERE nombre = $1";
    const checkResult = await pool.query(checkQuery, [nombre]);
    
    if (checkResult.rows.length > 0) {
      throw new Error("Ya existe una herramienta con este nombre");
    }

    const nextIdQuery = "SELECT COALESCE(MAX(id), 0) + 1 AS next_id FROM herramienta";
    const nextIdResult = await pool.query(nextIdQuery);
    const nextId = nextIdResult.rows[0].next_id;

    const query = `
      INSERT INTO herramienta (id, nombre, descripcion, slug, imagen)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *;
    `;
    const values = [nextId, nombre, descripcion, slug, imagen];
    const resultado = await pool.query(query, values);
    return resultado.rows[0];
  } catch (error) {
    throw new Error("Error al crear la herramienta: " + error.message);
  }
}

export async function obtenerHerramientaPorId(id) {
  if (!id) throw new Error("El ID de la herramienta es obligatorio");

  try {
    const query = "SELECT * FROM herramienta WHERE id = $1";
    const resultado = await pool.query(query, [id]);
    
    if (resultado.rows.length === 0) {
      throw new Error("No se encontró la herramienta con el ID especificado");
    }
    
    return resultado.rows[0];
  } catch (error) {
    throw new Error("Error al obtener la herramienta: " + error.message);
  }
}

export async function actualizarHerramienta({ id, nombre, descripcion, slug, imagen }) {
  if (!id) throw new Error("El ID de la herramienta es obligatorio");
  if (!nombre) throw new Error("El nombre de la herramienta es obligatorio");

  try {
    const query = `
      UPDATE herramienta
      SET nombre = $1, descripcion = $2, slug = $3, imagen = $4
      WHERE id = $5
      RETURNING *;
    `;
    const values = [nombre, descripcion, slug, imagen, id];
    const resultado = await pool.query(query, values);
    
    if (resultado.rows.length === 0) {
      throw new Error("No se encontró la herramienta a actualizar");
    }
    
    return resultado.rows[0];
  } catch (error) {
    throw new Error("Error al actualizar la herramienta: " + error.message);
  }
}

export async function eliminarHerramienta(id) {
  if (!id) throw new Error("El ID de la herramienta es obligatorio");

  try {
    const query = "DELETE FROM herramienta WHERE id = $1 RETURNING *;";
    const resultado = await pool.query(query, [id]);
    
    if (resultado.rowCount === 0) {
      throw new Error("No se encontró la herramienta a eliminar");
    }
    
    return resultado.rows[0];
  } catch (error) {
    throw new Error("Error al eliminar la herramienta: " + error.message);
  }
}