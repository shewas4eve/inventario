// ═══════════════════════════════════════════════════════════════════════════
// 📦 SISTEMA DE INVENTARIO - APPS SCRIPT BACKEND
// ═══════════════════════════════════════════════════════════════════════════
// Versión: 3.0 COMPLETA con Ventas de Materiales y Dashboard
// Fecha: 2025-01-27
// ═══════════════════════════════════════════════════════════════════════════

// ┌─────────────────────────────────────────────────────────────────────────┐
// │ 🔧 CONFIGURACIÓN INICIAL                                                 │
// └─────────────────────────────────────────────────────────────────────────┘

const SPREADSHEET_ID = "1nxYZdLCLD-lZ5nq69R4i2PEZj48PxAhewXa-5UQggUc";

// ┌─────────────────────────────────────────────────────────────────────────┐
// │ 📋 NOMBRES DE PESTAÑAS                                                   │
// └─────────────────────────────────────────────────────────────────────────┘

const HOJA_CATEGORIAS = "Categorias";
const HOJA_PRODUCTOS = "Productos";
const HOJA_COMPRAS = "Compras";
const HOJA_VENTAS = "Ventas";
const HOJA_MATERIALES = "Materiales";
const HOJA_COMPRAS_MATERIALES = "ComprasMateriales";
const HOJA_VENTAS_MATERIALES = "VentasMateriales";  // ← NUEVA
const HOJA_RESUMEN = "resumen_diario";

// ┌─────────────────────────────────────────────────────────────────────────┐
// │ 🏷️ DEFINICIÓN DE ENCABEZADOS                                            │
// └─────────────────────────────────────────────────────────────────────────┘

const CATEGORIAS_HEADERS = ["id", "nombre"];

const PRODUCTOS_HEADERS = [
    "id", "nombre", "código", "categoría", "precio_compra", 
    "precio_venta", "stock", "fecha_creado"
];

const COMPRAS_HEADERS = [
    "id", "producto_id", "cantidad", "precio_compra", "fecha", "proveedor"
];

const VENTAS_HEADERS = [
    "id", "producto_id", "cantidad", "precio_venta", "fecha", "cliente"
];

const MATERIALES_HEADERS = [
    "id", "nombre", "tipo", "precio_kg", "descripcion"
];

const COMPRAS_MATERIALES_HEADERS = [
    "id", "material_id", "peso_gramos", "peso_kg", "precio_kg", 
    "total_pagado", "proveedor", "fecha"
];

const VENTAS_MATERIALES_HEADERS = [  // ← NUEVO
    "id", "material_id", "peso_gramos", "peso_kg", "precio_kg", 
    "total_cobrado", "cliente", "fecha"
];

const RESUMEN_HEADERS = [
    "fecha", "total_ventas", "total_compras", "ganancia", "productos_vendidos"
];

// ┌─────────────────────────────────────────────────────────────────────────┐
// │ 🔑 FUNCIONES DE UTILIDAD                                                 │
// └─────────────────────────────────────────────────────────────────────────┘

function getSpreadsheet() {
    try {
        return SpreadsheetApp.openById(SPREADSHEET_ID);
    } catch (error) {
        throw new Error(`No se pudo abrir la hoja de cálculo. Verifica el SPREADSHEET_ID. Error: ${error.message}`);
    }
}

function generateUniqueAppId() {
    const timestamp = new Date().getTime().toString(36);
    const random = Math.random().toString(36).substring(2, 9);
    return `id-${timestamp}${random}`.toUpperCase();
}

function findProductRow(sheetProductos, productoId) {
    try {
        const data = sheetProductos.getDataRange().getValues();
        const idColIndex = 0;

        for (let i = 1; i < data.length; i++) {
            const rowId = String(data[i][idColIndex] || '');
            const searchId = String(productoId || '');
            
            if (rowId.toLowerCase() === searchId.toLowerCase()) {
                return { rowData: data[i], rowIndex: i };
            }
        }
        return { rowData: null, rowIndex: -1 };
    } catch (error) {
        Logger.log(`Error en findProductRow: ${error}`);
        return { rowData: null, rowIndex: -1 };
    }
}

function findMaterialRow(sheetMateriales, materialId) {
    try {
        const data = sheetMateriales.getDataRange().getValues();
        const idColIndex = 0;

        for (let i = 1; i < data.length; i++) {
            const rowId = String(data[i][idColIndex] || '');
            const searchId = String(materialId || '');
            
            if (rowId.toLowerCase() === searchId.toLowerCase()) {
                return { rowData: data[i], rowIndex: i };
            }
        }
        return { rowData: null, rowIndex: -1 };
    } catch (error) {
        Logger.log(`Error en findMaterialRow: ${error}`);
        return { rowData: null, rowIndex: -1 };
    }
}

// ┌─────────────────────────────────────────────────────────────────────────┐
// │ 🌐 ENDPOINT GET                                                          │
// └─────────────────────────────────────────────────────────────────────────┘

function doGet(e) {
    const action = e.parameter.action;
    const query = e.parameter.query;
    const sheetName = e.parameter.sheetName;
    let result;

    try {
        switch(action) {
            case "iniciar":
                result = iniciarBaseDeDatos();
                break;
            
            case "resetear":
                result = resetearBaseDeDatos();
                break;
            
            case "getCategorias":
                result = getCategorias();
                break;
            
            case "buscarProducto":
                result = buscarProducto(query);
                break;
            
            case "getInventario":
                result = getInventario();
                break;
            
            case "getMateriales":
                result = getMateriales();
                break;
            
            case "buscarMaterial":
                result = buscarMaterial(query);
                break;
            
            case "getInventarioMateriales":
                result = getInventarioMateriales();
                break;
            
            case "getResumenDiario":
                result = getResumenDiario();
                break;
            
            case "getMetricasMateriales":  // ← NUEVO
                result = getMetricasMateriales();
                break;
            
            case "getData":
                if (!sheetName) {
                    result = { status: "error", message: "Falta el parámetro sheetName" };
                } else {
                    result = getData(sheetName);
                }
                break;
            
            default:
                result = {
                    status: "error",
                    message: `Acción GET '${action}' no válida o faltan parámetros.`
                };
        }
    } catch (error) {
        result = {
            status: "error",
            message: `Error en doGet: ${error.message}`,
            stack: error.stack
        };
        Logger.log(`Error crítico en doGet: ${error}`);
    }

    return ContentService.createTextOutput(JSON.stringify(result))
           .setMimeType(ContentService.MimeType.JSON);
}

// ┌─────────────────────────────────────────────────────────────────────────┐
// │ 🌐 ENDPOINT POST                                                         │
// └─────────────────────────────────────────────────────────────────────────┘

function doPost(e) {
    try {
        if (!e.postData || !e.postData.contents) {
            return ContentService.createTextOutput(JSON.stringify({
                status: "error",
                message: "No se recibieron datos en la solicitud POST."
            })).setMimeType(ContentService.MimeType.JSON);
        }
        
        const requestData = JSON.parse(e.postData.contents);
        const action = requestData.action;

        let result;

        switch(action) {
            case "agregarCategoria":
                result = agregarCategoria(requestData);
                break;
            
            case "agregarProducto":
                result = agregarProducto(requestData);
                break;
            
            case "registrarTransaccion":
                result = registrarTransaccion(requestData);
                break;
            
            case "agregarMaterial":
                result = agregarMaterial(requestData);
                break;
            
            case "registrarCompraMaterial":
                result = registrarCompraMaterial(requestData);
                break;
            
            case "registrarVentaMaterial":  // ← NUEVO
                result = registrarVentaMaterial(requestData);
                break;
            
            default:
                result = {
                    status: "error",
                    message: `Acción POST '${action}' no reconocida.`
                };
        }
        
        return ContentService.createTextOutput(JSON.stringify(result))
               .setMimeType(ContentService.MimeType.JSON);

    } catch (error) {
        return ContentService.createTextOutput(JSON.stringify({
            status: "error",
            message: `Error al procesar la solicitud POST: ${error.message}`,
            stack: error.stack
        })).setMimeType(ContentService.MimeType.JSON);
    }
}

// ┌─────────────────────────────────────────────────────────────────────────┐
// │ 📂 FUNCIONES DE GESTIÓN DE CATEGORÍAS                                    │
// └─────────────────────────────────────────────────────────────────────────┘

function getCategorias() {
    return getData(HOJA_CATEGORIAS);
}

function agregarCategoria(data) {
    const ss = getSpreadsheet();
    const sheet = ss.getSheetByName(HOJA_CATEGORIAS);

    if (!sheet) {
        return {
            status: "error",
            message: `La pestaña '${HOJA_CATEGORIAS}' no existe. Inicie la Base de Datos.`
        };
    }

    const newId = generateUniqueAppId();
    const newRow = [newId, data.nombre];

    try {
        sheet.appendRow(newRow);
        return {
            status: "success",
            message: `Categoría '${data.nombre}' agregada (ID: ${newId}).`
        };
    } catch (e) {
        return {
            status: "error",
            message: `Error al escribir categoría: ${e.message}`
        };
    }
}

// ┌─────────────────────────────────────────────────────────────────────────┐
// │ 📦 FUNCIONES DE GESTIÓN DE PRODUCTOS                                     │
// └─────────────────────────────────────────────────────────────────────────┘

function getInventario() {
    return getData(HOJA_PRODUCTOS);
}

function buscarProducto(query) {
    const data = getData(HOJA_PRODUCTOS);

    if (data.status !== 'success') return data;
    
    const products = data.data;
    const lowerQuery = query.toLowerCase().trim();

    if (lowerQuery.length === 0) {
        return {
            status: "warning",
            message: "Especifique un ID, Código o Nombre para buscar."
        };
    }

    const results = products.filter(p => {
        const idStr = String(p.id || '');
        const codigoStr = String(p.código || '');
        const nombreStr = String(p.nombre || '');

        return idStr.toLowerCase().includes(lowerQuery) ||
               codigoStr.toLowerCase().includes(lowerQuery) ||
               nombreStr.toLowerCase().includes(lowerQuery);
    });

    if (results.length > 0) {
        return {
            status: "success",
            data: results,
            message: `${results.length} coincidencias encontradas.`
        };
    } else {
        return {
            status: "warning",
            message: "Producto no encontrado."
        };
    }
}

function agregarProducto(data) {
    const ss = getSpreadsheet();
    const sheet = ss.getSheetByName(HOJA_PRODUCTOS);

    if (!sheet) {
        return {
            status: "error",
            message: `La pestaña '${HOJA_PRODUCTOS}' no existe. Inicie la Base de Datos.`
        };
    }
    
    const newId = generateUniqueAppId();

    const newRow = [
        newId,
        data.nombre,
        data.codigo,
        data.categoria,
        parseFloat(data.precio_compra),
        parseFloat(data.precio_venta),
        parseInt(data.stock),
        new Date()
    ];

    try {
        sheet.appendRow(newRow);
        return {
            status: "success",
            message: `Producto '${data.nombre}' registrado con éxito. ID: ${newId}`
        };
    } catch (e) {
        return {
            status: "error",
            message: `Error al escribir producto: ${e.message}`
        };
    }
}

// ┌─────────────────────────────────────────────────────────────────────────┐
// │ 💰 FUNCIONES DE GESTIÓN DE TRANSACCIONES (COMPRAS/VENTAS PRODUCTOS)      │
// └─────────────────────────────────────────────────────────────────────────┘

function registrarTransaccion(data) {
    const ss = getSpreadsheet();
    const action = data.type;
    const isCompra = action === "compra";
    const sheetName = isCompra ? HOJA_COMPRAS : HOJA_VENTAS;
    const sheet = ss.getSheetByName(sheetName);
    const sheetProductos = ss.getSheetByName(HOJA_PRODUCTOS);

    if (!sheet || !sheetProductos) {
        return {
            status: "error",
            message: `Una o más pestañas necesarias no existen. Inicie la Base de Datos.`
        };
    }

    const { rowData, rowIndex } = findProductRow(sheetProductos, data.producto_id);
    
    if (rowIndex === -1) {
        return {
            status: "error",
            message: `Producto ID ${data.producto_id} no encontrado en inventario.`
        };
    }
    
    const stockColIndex = 6;
    const precioCompraColIndex = 4;
    const precioVentaColIndex = 5;
    
    const cantidad = parseInt(data.cantidad);
    const precioTransaccion = parseFloat(data.precio);
    
    let stockActual = parseFloat(rowData[stockColIndex]) || 0;
    let nuevoStock;

    if (!isCompra) {
        if (stockActual < cantidad) {
            return {
                status: "warning",
                message: `Stock insuficiente. Solo hay ${stockActual} unidades disponibles.`
            };
        }
        nuevoStock = stockActual - cantidad;
    } else {
        nuevoStock = stockActual + cantidad;
    }

    const transaccionId = generateUniqueAppId();
    const newRow = [
        transaccionId,
        data.producto_id,
        cantidad,
        precioTransaccion,
        new Date(),
        data.extra_data || ''
    ];

    try {
        sheet.appendRow(newRow);
    } catch (e) {
        return {
            status: "error",
            message: `Error al registrar transacción: ${e.message}`
        };
    }

    try {
        sheetProductos.getRange(rowIndex + 1, stockColIndex + 1).setValue(nuevoStock);
        
        if (isCompra) {
            const precioActualCompra = parseFloat(rowData[precioCompraColIndex]) || 0;
            if (precioTransaccion !== precioActualCompra) {
                sheetProductos.getRange(rowIndex + 1, precioCompraColIndex + 1).setValue(precioTransaccion);
            }
        } else {
            const precioActualVenta = parseFloat(rowData[precioVentaColIndex]) || 0;
            if (precioTransaccion !== precioActualVenta) {
                sheetProductos.getRange(rowIndex + 1, precioVentaColIndex + 1).setValue(precioTransaccion);
            }
        }

        return {
            status: "success",
            message: `${isCompra ? 'Compra' : 'Venta'} registrada exitosamente. Stock actualizado: ${nuevoStock} unidades.`
        };

    } catch (e) {
        sheet.deleteRow(sheet.getLastRow());
        return {
            status: "error",
            message: `Error al actualizar inventario: ${e.message}`
        };
    }
}

// ┌─────────────────────────────────────────────────────────────────────────┐
// │ ♻️ FUNCIONES DE GESTIÓN DE MATERIALES RECICLABLES                        │
// └─────────────────────────────────────────────────────────────────────────┘

function getMateriales() {
    return getData(HOJA_MATERIALES);
}

function getInventarioMateriales() {
    return getData(HOJA_MATERIALES);
}

function buscarMaterial(query) {
    const data = getData(HOJA_MATERIALES);

    if (data.status !== 'success') return data;
    
    const materiales = data.data;
    const lowerQuery = query.toLowerCase().trim();

    if (lowerQuery.length === 0) {
        return {
            status: "warning",
            message: "Especifique un ID o Nombre para buscar."
        };
    }

    const results = materiales.filter(m => {
        const idStr = String(m.id || '');
        const nombreStr = String(m.nombre || '');

        return idStr.toLowerCase().includes(lowerQuery) ||
               nombreStr.toLowerCase().includes(lowerQuery);
    });

    if (results.length > 0) {
        return {
            status: "success",
            data: results,
            message: `${results.length} coincidencias encontradas.`
        };
    } else {
        return {
            status: "warning",
            message: "Material no encontrado."
        };
    }
}

function agregarMaterial(data) {
    const ss = getSpreadsheet();
    const sheet = ss.getSheetByName(HOJA_MATERIALES);

    if (!sheet) {
        return {
            status: "error",
            message: `La pestaña '${HOJA_MATERIALES}' no existe. Inicie la Base de Datos.`
        };
    }
    
    const newId = generateUniqueAppId();

    const newRow = [
        newId,
        data.nombre,
        data.tipo,
        parseFloat(data.precio_kg),
        data.descripcion || ''
    ];

    try {
        sheet.appendRow(newRow);
        return {
            status: "success",
            message: `Material '${data.nombre}' agregado (ID: ${newId}).`,
            data: { id: newId }
        };
    } catch (e) {
        return {
            status: "error",
            message: `Error al escribir material: ${e.message}`
        };
    }
}

// ┌─────────────────────────────────────────────────────────────────────────┐
// │ 🛒 COMPRA DE MATERIALES                                                  │
// └─────────────────────────────────────────────────────────────────────────┘

function registrarCompraMaterial(data) {
    const ss = getSpreadsheet();
    const sheet = ss.getSheetByName(HOJA_COMPRAS_MATERIALES);
    const sheetMateriales = ss.getSheetByName(HOJA_MATERIALES);

    if (!sheet || !sheetMateriales) {
        return {
            status: "error",
            message: `Una o más pestañas necesarias no existen. Inicie la Base de Datos.`
        };
    }

    const { rowData, rowIndex } = findMaterialRow(sheetMateriales, data.material_id);
    
    if (rowIndex === -1) {
        return {
            status: "error",
            message: `Material ID ${data.material_id} no encontrado.`
        };
    }

    const pesoGramos = parseFloat(data.peso_gramos);
    const pesoKg = pesoGramos / 1000;
    const precioKg = parseFloat(data.precio_kg);
    const totalPagado = pesoKg * precioKg;

    const compraId = generateUniqueAppId();
    const newRow = [
        compraId,
        data.material_id,
        pesoGramos,
        pesoKg,
        precioKg,
        totalPagado,
        data.proveedor || '',
        new Date()
    ];

    try {
        sheet.appendRow(newRow);
        return {
            status: "success",
            message: `Compra de material registrada. Total pagado: $${totalPagado.toFixed(2)}`
        };
    } catch (e) {
        return {
            status: "error",
            message: `Error al registrar compra de material: ${e.message}`
        };
    }
}

// ┌─────────────────────────────────────────────────────────────────────────┐
// │ 💵 VENTA DE MATERIALES (NUEVO)                                           │
// └─────────────────────────────────────────────────────────────────────────┘

function registrarVentaMaterial(data) {
    const ss = getSpreadsheet();
    const sheetVentas = ss.getSheetByName(HOJA_VENTAS_MATERIALES);
    const sheetCompras = ss.getSheetByName(HOJA_COMPRAS_MATERIALES);
    const sheetMateriales = ss.getSheetByName(HOJA_MATERIALES);

    if (!sheetVentas || !sheetCompras || !sheetMateriales) {
        return {
            status: "error",
            message: `Una o más pestañas necesarias no existen. Inicie la Base de Datos.`
        };
    }

    // Verificar que el material existe
    const { rowData, rowIndex } = findMaterialRow(sheetMateriales, data.material_id);
    
    if (rowIndex === -1) {
        return {
            status: "error",
            message: `Material ID ${data.material_id} no encontrado.`
        };
    }

    // Calcular stock actual del material
    const stockActual = calcularStockMaterial(data.material_id, sheetCompras, sheetVentas);
    const pesoGramos = parseFloat(data.peso_gramos);
    const pesoKg = pesoGramos / 1000;

    // Verificar stock suficiente
    if (stockActual < pesoKg) {
        return {
            status: "warning",
            message: `Stock insuficiente. Solo hay ${stockActual.toFixed(3)} kg disponibles.`
        };
    }

    const precioKg = parseFloat(data.precio_kg);
    const totalCobrado = pesoKg * precioKg;

    const ventaId = generateUniqueAppId();
    const newRow = [
        ventaId,
        data.material_id,
        pesoGramos,
        pesoKg,
        precioKg,
        totalCobrado,
        data.cliente || '',
        new Date()
    ];

    try {
        sheetVentas.appendRow(newRow);
        return {
            status: "success",
            message: `Venta de material registrada. Total cobrado: $${totalCobrado.toFixed(2)}. Stock restante: ${(stockActual - pesoKg).toFixed(3)} kg`
        };
    } catch (e) {
        return {
            status: "error",
            message: `Error al registrar venta de material: ${e.message}`
        };
    }
}

// Función auxiliar para calcular stock de un material
function calcularStockMaterial(materialId, sheetCompras, sheetVentas) {
    let totalComprado = 0;
    let totalVendido = 0;

    // Sumar compras
    if (sheetCompras.getLastRow() > 1) {
        const comprasData = sheetCompras.getDataRange().getValues();
        for (let i = 1; i < comprasData.length; i++) {
            if (String(comprasData[i][1]) === String(materialId)) {
                totalComprado += parseFloat(comprasData[i][3]) || 0; // peso_kg está en columna 3
            }
        }
    }

    // Restar ventas
    if (sheetVentas.getLastRow() > 1) {
        const ventasData = sheetVentas.getDataRange().getValues();
        for (let i = 1; i < ventasData.length; i++) {
            if (String(ventasData[i][1]) === String(materialId)) {
                totalVendido += parseFloat(ventasData[i][3]) || 0; // peso_kg está en columna 3
            }
        }
    }

    return totalComprado - totalVendido;
}

// ┌─────────────────────────────────────────────────────────────────────────┐
// │ 📊 MÉTRICAS DE MATERIALES PARA DASHBOARD (NUEVO)                         │
// └─────────────────────────────────────────────────────────────────────────┘

function getMetricasMateriales() {
    const ss = getSpreadsheet();
    const sheetMateriales = ss.getSheetByName(HOJA_MATERIALES);
    const sheetCompras = ss.getSheetByName(HOJA_COMPRAS_MATERIALES);
    const sheetVentas = ss.getSheetByName(HOJA_VENTAS_MATERIALES);

    if (!sheetMateriales || !sheetCompras || !sheetVentas) {
        return {
            status: "error",
            message: "Una o más pestañas de materiales no existen."
        };
    }

    try {
        let totalInvertido = 0;
        let totalVendido = 0;
        let valorInventario = 0;
        const comprasPorTipo = {};
        const materialesStock = {};

        // Procesar compras
        if (sheetCompras.getLastRow() > 1) {
            const comprasData = sheetCompras.getDataRange().getValues();
            for (let i = 1; i < comprasData.length; i++) {
                const totalPagado = parseFloat(comprasData[i][5]) || 0;
                totalInvertido += totalPagado;
            }
        }

        // Procesar ventas
        if (sheetVentas.getLastRow() > 1) {
            const ventasData = sheetVentas.getDataRange().getValues();
            for (let i = 1; i < ventasData.length; i++) {
                const totalCobrado = parseFloat(ventasData[i][5]) || 0;
                totalVendido += totalCobrado;
            }
        }

        // Procesar materiales y calcular inventario
        if (sheetMateriales.getLastRow() > 1) {
            const materialesData = sheetMateriales.getDataRange().getValues();
            
            for (let i = 1; i < materialesData.length; i++) {
                const materialId = materialesData[i][0];
                const tipo = materialesData[i][2];
                const precioKg = parseFloat(materialesData[i][3]) || 0;
                
                // Calcular stock
                const stock = calcularStockMaterial(materialId, sheetCompras, sheetVentas);
                materialesStock[materialId] = {
                    nombre: materialesData[i][1],
                    tipo: tipo,
                    stock: stock,
                    precioKg: precioKg
                };
                
                // Sumar al valor del inventario
                valorInventario += stock * precioKg;
                
                // Contar compras por tipo
                if (!comprasPorTipo[tipo]) {
                    comprasPorTipo[tipo] = 0;
                }
            }
        }

        // Encontrar material más comprado
        let materialMasComprado = null;
        let maxStock = 0;
        
        for (const materialId in materialesStock) {
            const stock = materialesStock[materialId].stock;
            if (stock > maxStock) {
                maxStock = stock;
                materialMasComprado = materialesStock[materialId].nombre;
            }
        }

        // Contar compras por tipo
        if (sheetCompras.getLastRow() > 1) {
            const comprasData = sheetCompras.getDataRange().getValues();
            for (let i = 1; i < comprasData.length; i++) {
                const materialId = comprasData[i][1];
                if (materialesStock[materialId]) {
                    const tipo = materialesStock[materialId].tipo;
                    comprasPorTipo[tipo] = (comprasPorTipo[tipo] || 0) + 1;
                }
            }
        }

        const ganancia = totalVendido - totalInvertido;

        return {
            status: "success",
            data: {
                totalInvertido: totalInvertido,
                totalVendido: totalVendido,
                ganancia: ganancia,
                valorInventario: valorInventario,
                materialMasComprado: materialMasComprado || "N/A",
                comprasPorTipo: comprasPorTipo
            }
        };

    } catch (error) {
        return {
            status: "error",
            message: `Error al calcular métricas: ${error.message}`
        };
    }
}

// ┌─────────────────────────────────────────────────────────────────────────┐
// │ 📊 FUNCIONES DE RESUMEN Y REPORTES                                       │
// └─────────────────────────────────────────────────────────────────────────┘

function getResumenDiario() {
    return getData(HOJA_RESUMEN);
}

// ┌─────────────────────────────────────────────────────────────────────────┐
// │ 🔄 FUNCIONES DE UTILIDAD GENERAL                                         │
// └─────────────────────────────────────────────────────────────────────────┘

function getData(sheetName) {
    const ss = getSpreadsheet();
    const sheet = ss.getSheetByName(sheetName);

    if (!sheet || sheet.getLastRow() < 2) {
        return {
            status: "error",
            message: `Pestaña '${sheetName}' vacía o no existe.`
        };
    }

    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const rows = data.slice(1);

    const mappedData = rows.map(row => {
        let entry = {};
        headers.forEach((header, index) => {
            let value = row[index];
            
            if (value === '' || value === null || value === undefined) {
                value = '';
            } else if (typeof value === 'number') {
                value = value;
            } else if (typeof value === 'string' && !isNaN(value) && value.trim() !== '') {
                if (header === 'código' && /[a-zA-Z]/.test(value)) {
                    value = value;
                } else {
                    value = parseFloat(value);
                }
            } else if (value instanceof Date) {
                // Mantener como Date
            } else {
                value = String(value);
            }
            
            entry[header] = value;
        });
        return entry;
    });

    const filteredData = mappedData.filter(entry => {
        return Object.values(entry).some(value => value !== '' && value !== null);
    });

    return { status: "success", data: filteredData };
}

// ┌─────────────────────────────────────────────────────────────────────────┐
// │ ⚙️ FUNCIONES DE CONFIGURACIÓN DE BASE DE DATOS                           │
// └─────────────────────────────────────────────────────────────────────────┘

function createOrResetSheet(ss, name, headers) {
    let sheet = ss.getSheetByName(name);
    let action = "verificada";

    if (!sheet) {
        sheet = ss.insertSheet(name);
        action = "creada";
    }

    sheet.clearContents();
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.setFrozenRows(1);

    return `Pestaña '${name}' ${action}.`;
}

function iniciarBaseDeDatos() {
    const ss = getSpreadsheet();
    let msg = [];

    msg.push(createOrResetSheet(ss, HOJA_CATEGORIAS, CATEGORIAS_HEADERS));
    msg.push(createOrResetSheet(ss, HOJA_PRODUCTOS, PRODUCTOS_HEADERS));
    msg.push(createOrResetSheet(ss, HOJA_COMPRAS, COMPRAS_HEADERS));
    msg.push(createOrResetSheet(ss, HOJA_VENTAS, VENTAS_HEADERS));
    msg.push(createOrResetSheet(ss, HOJA_MATERIALES, MATERIALES_HEADERS));
    msg.push(createOrResetSheet(ss, HOJA_COMPRAS_MATERIALES, COMPRAS_MATERIALES_HEADERS));
    msg.push(createOrResetSheet(ss, HOJA_VENTAS_MATERIALES, VENTAS_MATERIALES_HEADERS));  // ← NUEVO
    msg.push(createOrResetSheet(ss, HOJA_RESUMEN, RESUMEN_HEADERS));

    return {
        status: "success",
        message: `Base de datos inicializada: ${msg.join(" ")}`
    };
}

function resetearBaseDeDatos() {
    const ss = getSpreadsheet();
    let msg = [];

    ss.getSheets().forEach(sheet => {
        const sheetName = sheet.getName();
        if (sheetName !== "Hoja 1") {
            ss.deleteSheet(sheet);
            msg.push(`Pestaña '${sheetName}' eliminada.`);
        }
    });

    msg.push(createOrResetSheet(ss, HOJA_CATEGORIAS, CATEGORIAS_HEADERS));
    msg.push(createOrResetSheet(ss, HOJA_PRODUCTOS, PRODUCTOS_HEADERS));
    msg.push(createOrResetSheet(ss, HOJA_COMPRAS, COMPRAS_HEADERS));
    msg.push(createOrResetSheet(ss, HOJA_VENTAS, VENTAS_HEADERS));
    msg.push(createOrResetSheet(ss, HOJA_MATERIALES, MATERIALES_HEADERS));
    msg.push(createOrResetSheet(ss, HOJA_COMPRAS_MATERIALES, COMPRAS_MATERIALES_HEADERS));
    msg.push(createOrResetSheet(ss, HOJA_VENTAS_MATERIALES, VENTAS_MATERIALES_HEADERS));  // ← NUEVO
    msg.push(createOrResetSheet(ss, HOJA_RESUMEN, RESUMEN_HEADERS));

    return {
        status: "success",
        message: `Base de datos reseteada completamente: ${msg.join(" ")}`
    };
}

// ┌─────────────────────────────────────────────────────────────────────────┐
// │ 🧪 FUNCIÓN DE PRUEBA                                                     │
// └─────────────────────────────────────────────────────────────────────────┘

function testConexion() {
    Logger.log("=== INICIANDO PRUEBA DE CONEXIÓN ===");
    
    try {
        const ss = getSpreadsheet();
        Logger.log(`✅ Spreadsheet conectado: ${ss.getName()}`);
        Logger.log(`📋 ID: ${ss.getId()}`);
        
        const sheets = ss.getSheets().map(s => s.getName());
        Logger.log(`📝 Pestañas disponibles: ${sheets.join(", ")}`);
        
        return {
            status: "success",
            spreadsheet: ss.getName(),
            id: ss.getId(),
            sheets: sheets
        };
    } catch (error) {
        Logger.log(`❌ Error: ${error.message}`);
        return {
            status: "error",
            message: error.message
        };
    }
}
