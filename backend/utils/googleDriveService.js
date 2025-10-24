// services/utils/googleDriveService.js
import { google } from 'googleapis';
import fs from 'fs';
import path from 'path';
import fsExtra from 'fs-extra';

class GoogleDriveService {
  constructor() {
    // Carga las credenciales desde el archivo JSON (asegúrate de que esté en un lugar seguro)
    this.KEYFILEPATH = path.join(process.cwd(), 'config', 'google-drive-key.json');
    this.SCOPES = ['https://www.googleapis.com/auth/drive'];
    
    // Inicializa el cliente de autenticación
    this.auth = new google.auth.GoogleAuth({
      keyFile: this.KEYFILEPATH,
      scopes: this.SCOPES,
    });
    
    // Inicializa el cliente de Drive
    this.driveClient = null;
    this.init();
  }
  
  async init() {
    try {
      const authClient = await this.auth.getClient();
      this.driveClient = google.drive({ version: 'v3', auth: authClient });
      console.log('Google Drive service initialized');
    } catch (error) {
      console.error('Error initializing Google Drive service:', error);
    }
  }
  
  /**
   * Obtiene o crea una carpeta en Google Drive
   * @param {string} folderName - Nombre de la carpeta
   * @param {string} parentFolderId - ID de la carpeta padre (opcional)
   * @returns {Promise<string>} - ID de la carpeta
   */
  async getOrCreateFolder(folderName, parentFolderId = null) {
    try {
      // Verificar si la carpeta ya existe
      const query = parentFolderId 
        ? `name='${folderName}' and mimeType='application/vnd.google-apps.folder' and '${parentFolderId}' in parents and trashed=false`
        : `name='${folderName}' and mimeType='application/vnd.google-apps.folder' and trashed=false`;
        
      const res = await this.driveClient.files.list({
        q: query,
        fields: 'files(id, name)',
      });
      
      // Si la carpeta existe, devolver su ID
      if (res.data.files.length > 0) {
        return res.data.files[0].id;
      }
      
      // Si no existe, crear la carpeta
      const fileMetadata = {
        name: folderName,
        mimeType: 'application/vnd.google-apps.folder',
        ...(parentFolderId && { parents: [parentFolderId] }),
      };
      
      const folder = await this.driveClient.files.create({
        resource: fileMetadata,
        fields: 'id',
      });
      
      return folder.data.id;
    } catch (error) {
      console.error(`Error al crear/obtener carpeta ${folderName}:`, error);
      throw error;
    }
  }
  
/**
 * Crea una estructura de carpetas año/mes para organizar facturas
 * @param {Date} date - Fecha para determinar año/mes
 * @param {string} baseFolderId - ID de la carpeta base (opcional)
 * @returns {Promise<string>} - ID de la carpeta del mes
 */
async createYearMonthFolderStructure(date, baseFolderId = null) {
    try {
      // Determinar año y mes
      const year = date.getFullYear().toString();
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      
      // Primero obtener/crear la carpeta de facturas si no se proporciona una carpeta base
      const invoicesFolderId = baseFolderId || await this.getOrCreateFolder('Facturas_Acadelia');
      
      // Obtener/crear la subcarpeta "Egresos" dentro de Facturas_Acadelia
      const egresosFolderId = await this.getOrCreateFolder('Egresos', invoicesFolderId);
      
      // Obtener/crear la carpeta del año dentro de Egresos
      const yearFolderId = await this.getOrCreateFolder(year, egresosFolderId);
      
      // Obtener/crear la carpeta del mes
      const monthFolderName = `${month}_${this.getMonthName(date)}`;
      const monthFolderId = await this.getOrCreateFolder(monthFolderName, yearFolderId);
      
      return monthFolderId;
    } catch (error) {
      console.error('Error al crear estructura de carpetas:', error);
      throw error;
    }
  }
  
  /**
   * Obtiene el nombre del mes en español
   * @param {Date} date - Fecha 
   * @returns {string} - Nombre del mes
   */
  getMonthName(date) {
    const months = [
      'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];
    return months[date.getMonth()];
  }
  
  /**
   * Sube un archivo a Google Drive
   * @param {string} filePath - Ruta del archivo local
   * @param {string} fileName - Nombre a asignar al archivo
   * @param {string} folderId - ID de la carpeta donde subir el archivo
   * @returns {Promise<Object>} - Información del archivo subido
   */
  async uploadFile(filePath, fileName, folderId) {
    try {
      // Verificar que el archivo existe
      if (!fs.existsSync(filePath)) {
        throw new Error(`El archivo ${filePath} no existe`);
      }
      
      // Preparar metadatos del archivo
      const fileMetadata = {
        name: fileName,
        parents: [folderId],
      };
      
      // Crear stream de lectura del archivo
      const media = {
        mimeType: 'application/pdf',
        body: fs.createReadStream(filePath),
      };
      
      // Subir archivo
      const response = await this.driveClient.files.create({
        resource: fileMetadata,
        media: media,
        fields: 'id,name,webViewLink',
      });
      
      console.log(`Archivo subido con ID: ${response.data.id}`);
      
      // Configurar permisos para que el archivo sea accesible mediante enlace
      await this.driveClient.permissions.create({
        fileId: response.data.id,
        requestBody: {
          role: 'reader',
          type: 'anyone',
        },
      });
      
      return response.data;
    } catch (error) {
      console.error('Error al subir archivo a Google Drive:', error);
      throw error;
    }
  }
  
  /**
   * Carga una factura a Google Drive organizándola por año/mes
   * @param {string} filePath - Ruta del archivo temporal
   * @param {string} expenseId - ID del egreso para nombrar el archivo
   * @param {Date} expenseDate - Fecha del egreso para organizar en carpetas
   * @returns {Promise<string>} - URL de vista web del archivo
   */
  async uploadInvoice(filePath, expenseId, expenseDate) {
    try {
      // Crear estructura de carpetas año/mes
      const folderId = await this.createYearMonthFolderStructure(expenseDate);
      
      // Generar nombre descriptivo para el archivo
      const fileName = `Factura_${expenseId}_${expenseDate.toISOString().split('T')[0]}.pdf`;
      
      // Subir archivo
      const fileData = await this.uploadFile(filePath, fileName, folderId);
      
      // Eliminar archivo temporal después de subir
      fs.unlink(filePath, (err) => {
        if (err) console.error('Error al eliminar archivo temporal:', err);
      });
      
      return fileData.webViewLink;
    } catch (error) {
      console.error('Error al cargar factura:', error);
      throw error;
    }
  }
  /**
 * Crea una estructura de carpetas año/mes para organizar facturas de ingresos
 * @param {Date} date - Fecha para determinar año/mes
 * @param {string} baseFolderId - ID de la carpeta base (opcional)
 * @returns {Promise<string>} - ID de la carpeta del mes
 */
async createYearMonthFolderStructureForIncome(date, baseFolderId = null) {
  try {
    // Determinar año y mes
    const year = date.getFullYear().toString();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    
    // Primero obtener/crear la carpeta de facturas si no se proporciona una carpeta base
    const invoicesFolderId = baseFolderId || await this.getOrCreateFolder('Facturas_Acadelia');
    
    // Obtener/crear la subcarpeta "Ingresos" dentro de Facturas_Acadelia
    const ingresosFolderId = await this.getOrCreateFolder('Ingresos', invoicesFolderId);
    
    // Obtener/crear la carpeta del año dentro de Ingresos
    const yearFolderId = await this.getOrCreateFolder(year, ingresosFolderId);
    
    // Obtener/crear la carpeta del mes
    const monthFolderName = `${month}_${this.getMonthName(date)}`;
    const monthFolderId = await this.getOrCreateFolder(monthFolderName, yearFolderId);
    
    return monthFolderId;
  } catch (error) {
    console.error('Error al crear estructura de carpetas para ingresos:', error);
    throw error;
  }
}
/**
 * Descarga y sube una factura de ingresos a Google Drive
 * @param {string} invoiceUrl - URL de la factura de Paddle
 * @param {string} transactionId - ID de la transacción para nombrar el archivo
 * @param {Date} transactionDate - Fecha de la transacción para organizar en carpetas
 * @returns {Promise<string>} - URL de vista web del archivo en Google Drive
 */
async uploadInvoiceFromPaddle(invoiceUrl, transactionId, transactionDate) {
  try {
    // Crear estructura de carpetas año/mes para ingresos
    const folderId = await this.createYearMonthFolderStructureForIncome(transactionDate);
    
    // Crear un archivo temporal para descargar la factura
    const tempFilePath = path.join(process.cwd(), 'uploads', 'temp', `paddle_invoice_${transactionId}.pdf`);
    
    // Crear el directorio si no existe
    const tempDir = path.dirname(tempFilePath);
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    
    console.log(`Descargando factura desde: ${invoiceUrl}`);
    
    // Descargar la factura de Paddle usando fetch
    const response = await fetch(invoiceUrl);
    if (!response.ok) {
      throw new Error(`Error al descargar factura: ${response.status} ${response.statusText}`);
    }
    
    // Convertir la respuesta a un array buffer y escribirlo en el archivo
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    fs.writeFileSync(tempFilePath, buffer);
    
    console.log(`Factura descargada a: ${tempFilePath}`);
    
    // Generar nombre descriptivo para el archivo
    const fileName = `Factura_${transactionId}_${transactionDate.toISOString().split('T')[0]}.pdf`;
    
    // Subir archivo a Google Drive
    const fileData = await this.uploadFile(tempFilePath, fileName, folderId);
    
    console.log(`Factura subida a Google Drive: ${fileData.webViewLink}`);
    
    // Eliminar archivo temporal después de subir
    fs.unlink(tempFilePath, (err) => {
      if (err) console.error('Error al eliminar archivo temporal:', err);
    });
    
    return fileData.webViewLink;
  } catch (error) {
    console.error('Error al cargar factura de Paddle:', error);
    throw error;
  }
}

/**
 * Crea una estructura de carpetas para los informes integrales
 * @param {Date} date - Fecha para determinar año/mes
 * @returns {Promise<string>} - ID de la carpeta donde guardar el informe
 */
async createReportFolderStructure(date) {
  try {
    // Determinar año y mes
    const year = date.getFullYear().toString();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    
    // Obtener/crear la carpeta base Facturas_Acadelia
    const baseFolder = await this.getOrCreateFolder('Facturas_Acadelia');
    
    // Obtener/crear la subcarpeta "Informe_Integral" dentro de Facturas_Acadelia
    const reportsFolderId = await this.getOrCreateFolder('Informe_Integral', baseFolder);
    
    // Obtener/crear la carpeta del año dentro de Informe_Integral
    const yearFolderId = await this.getOrCreateFolder(year, reportsFolderId);
    
    // Obtener/crear la carpeta del mes
    const monthFolderName = `${month}_${this.getMonthName(date)}`;
    const monthFolderId = await this.getOrCreateFolder(monthFolderName, yearFolderId);
    
    return monthFolderId;
  } catch (error) {
    console.error('Error al crear estructura de carpetas para informes:', error);
    throw error;
  }
}

/**
 * Sube un informe integral a Google Drive
 * @param {string} filePath - Ruta del archivo PDF
 * @param {string} reportId - ID del informe para nombrar el archivo
 * @param {Date} reportDate - Fecha del informe para organizar en carpetas
 * @returns {Promise<string>} - URL de vista web del archivo
 */
async uploadIntegralReport(filePath, reportId, reportDate) {
  try {
    // Crear estructura de carpetas específica para informes
    const folderId = await this.createReportFolderStructure(reportDate);
    
    // Generar nombre descriptivo para el archivo
    const fileName = `Informe_Integral_${reportId}_${reportDate.toISOString().split('T')[0]}.pdf`;
    
    // Subir archivo
    const fileData = await this.uploadFile(filePath, fileName, folderId);
    
    return fileData.webViewLink;
  } catch (error) {
    console.error('Error al cargar informe a Google Drive:', error);
    throw error;
  }
}

/**
 * Crea estructura de carpetas para comprobantes de transferencia
 * @param {Date} date - Fecha de la transferencia
 * @returns {Promise<string>} - ID de la carpeta
 */
async createTransferProofFolderStructure(date) {
  try {
    const year = date.getFullYear().toString();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    
    // Carpeta base
    const baseFolder = await this.getOrCreateFolder('Comprobantes_Argentina');
    
    // Subcarpeta "Transferencias_Bancarias"
    const transfersFolder = await this.getOrCreateFolder('Transferencias_Bancarias', baseFolder);
    
    // Carpeta del año
    const yearFolder = await this.getOrCreateFolder(year, transfersFolder);
    
    // Carpeta del mes
    const monthFolderName = `${month}_${this.getMonthName(date)}`;
    const monthFolder = await this.getOrCreateFolder(monthFolderName, yearFolder);
    
    return monthFolder;
  } catch (error) {
    console.error('Error al crear estructura para transferencias:', error);
    throw error;
  }
}

/**
 * Sube comprobante de transferencia bancaria
 * @param {string} filePath - Ruta del archivo temporal
 * @param {string} fileName - Nombre del archivo
 * @returns {Promise<string>} - URL de vista web del archivo
 */
async uploadTransferProof(filePath, fileName) {
  try {
    const folderId = await this.createTransferProofFolderStructure(new Date());
    
    // Preparar metadatos del archivo
    const fileMetadata = {
      name: fileName,
      parents: [folderId],
    };
    
    // Determinar tipo MIME
    const extension = path.extname(fileName).toLowerCase();
    let mimeType = 'application/octet-stream';
    
    if (['.jpg', '.jpeg'].includes(extension)) {
      mimeType = 'image/jpeg';
    } else if (extension === '.png') {
      mimeType = 'image/png';
    } else if (extension === '.pdf') {
      mimeType = 'application/pdf';
    }
    
    const media = {
      mimeType: mimeType,
      body: fs.createReadStream(filePath),
    };
    
    // Subir archivo
    const response = await this.driveClient.files.create({
      resource: fileMetadata,
      media: media,
      fields: 'id,name,webViewLink',
    });
    
    // Configurar permisos
    await this.driveClient.permissions.create({
      fileId: response.data.id,
      requestBody: {
        role: 'reader',
        type: 'anyone',
      },
    });
    
    console.log(`Comprobante subido: ${response.data.webViewLink}`);
    return response.data.webViewLink;
    
  } catch (error) {
    console.error('Error al subir comprobante:', error);
    throw error;
  }
}
}

export const googleDriveService = new GoogleDriveService();