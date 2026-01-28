// ═══════════════════════════════════════════════════════════════════════════
// 🎯 SISTEMA DE INVENTARIO COMPLETO - FRONTEND JAVASCRIPT
// ═══════════════════════════════════════════════════════════════════════════
// Versión: 3.0 FINAL con Ventas de Materiales y Dashboard Completo
// Fecha: 2025-01-28
// ═══════════════════════════════════════════════════════════════════════════

// ⚠️ IMPORTANTE: Reemplaza esta URL con la de TU Apps Script implementado
const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbyfXmCx5ETWXZ8j54YJyhuaOqUGYpAhz-t-TUbmPwdTXgCyG1h_ACTdSsiT1Wy0dw2l/exec';

// Cache de datos
let productDataCache = {};
let materialDataCache = {};
let resumenFinancieroChart, tendenciasChart, materialesChart;

// ═══════════════════════════════════════════════════════════════════════════
// 🚀 INICIALIZACIÓN
// ═══════════════════════════════════════════════════════════════════════════

document.addEventListener('DOMContentLoaded', () => {
    setupNavigation();
    loadInitialData();
    setupForms();
});

// ═══════════════════════════════════════════════════════════════════════════
// 🧭 NAVEGACIÓN
// ═══════════════════════════════════════════════════════════════════════════

function setupNavigation() {
    const navLinks = document.querySelectorAll('.sidebar-nav a');
    const sections = document.querySelectorAll('.main-content .content-section');
    
    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const targetId = link.getAttribute('data-section');

            navLinks.forEach(l => l.classList.remove('active'));
            link.classList.add('active');

            sections.forEach(section => {
                if (section.id === targetId) {
                    section.classList.add('active');
                    
                    if (targetId === 'dashboard') {
                        handleLoadDashboard();
                    } else if (targetId === 'inventario') {
                        document.getElementById('cargarInventarioBtn').click();
                    } else if (targetId === 'materiales') {
                        cargarMateriales();
                    } else if (targetId === 'inventario-materiales') {
                        cargarInventarioMateriales();
                    }
                } else {
                    section.classList.remove('active');
                }
            });
        });
    });
}

// ═══════════════════════════════════════════════════════════════════════════
// 📥 CARGA INICIAL DE DATOS
// ═══════════════════════════════════════════════════════════════════════════

async function loadInitialData() {
    try {
        const response = await fetch(`${SCRIPT_URL}?action=getCategorias`);
        const data = await response.json();
        
        if (data.status === 'success') {
            populateCategories(data.data);
        } else {
            displayStatus('statusProducto', 'warning', `No se pudieron cargar las categorías: ${data.message}.`);
            populateCategories([]);
        }
    } catch (error) {
        displayStatus('statusProducto', 'error', `Error de conexión al cargar categorías.`);
        populateCategories([]);
    }
    
    await cargarMateriales();
}

function populateCategories(categories) {
    const selectProducto = document.getElementById('p_categoria');
    selectProducto.innerHTML = '';
    
    if (categories.length === 0) {
        selectProducto.innerHTML = '<option value="" disabled selected>No hay categorías registradas</option>';
        document.getElementById('listaCategorias').innerHTML = '<li>No hay categorías.</li>';
        return;
    }

    selectProducto.innerHTML = '<option value="" disabled selected>Seleccione una categoría</option>';
    
    const listHtml = categories.map(cat => {
        const name = cat.nombre || `(ID ${cat.id})`;
        selectProducto.innerHTML += `<option value="${name}">${name}</option>`;
        return `<li>ID: ${cat.id} | Nombre: ${name}</li>`;
    }).join('');
    
    document.getElementById('listaCategorias').innerHTML = listHtml;
}

// ═══════════════════════════════════════════════════════════════════════════
// 🎛️ CONFIGURACIÓN DE FORMULARIOS Y EVENTOS
// ═══════════════════════════════════════════════════════════════════════════

function setupForms() {
    // Configuración
    document.getElementById('iniciarDBBtn').addEventListener('click', () => handleConfigAction('iniciar'));
    document.getElementById('resetDBBtn').addEventListener('click', () => {
        if (window.confirm("¡ADVERTENCIA! ¿Deseas RESETEAR TODA la base de datos? Esto es irreversible.")) {
            handleConfigAction('resetear');
        }
    });

    // Categorías y Productos
    document.getElementById('categoriaForm').addEventListener('submit', (e) => handlePostAction(e, 'agregarCategoria', 'statusCategoria'));
    document.getElementById('productoForm').addEventListener('submit', (e) => handlePostAction(e, 'agregarProducto', 'statusProducto'));
    
    // Compras/Ventas de Productos
    document.getElementById('co_query').addEventListener('input', (e) => handleQueryFilter(e.target.value, 'co'));
    document.getElementById('v_query').addEventListener('input', (e) => handleQueryFilter(e.target.value, 'v'));
    
    document.getElementById('compraForm').addEventListener('submit', (e) => handleTransactionPost(e, 'compra'));
    document.getElementById('ventaForm').addEventListener('submit', (e) => handleTransactionPost(e, 'venta'));

    // Materiales Reciclables
    document.getElementById('materialForm').addEventListener('submit', handleMaterialPost);
    
    // Compra de materiales
    document.getElementById('cm_query').addEventListener('input', handleMaterialQueryFilter);
    document.getElementById('cm_peso_gramos').addEventListener('input', updateCompraMaterialPreview);
    document.getElementById('cm_precio_kg').addEventListener('input', updateCompraMaterialPreview);
    document.getElementById('compraMaterialForm').addEventListener('submit', handleCompraMaterialPost);
    
    // Venta de materiales
    document.getElementById('vm_query').addEventListener('input', handleVentaMaterialQueryFilter);
    document.getElementById('vm_peso_gramos').addEventListener('input', updateVentaMaterialPreview);
    document.getElementById('vm_precio_kg').addEventListener('input', updateVentaMaterialPreview);
    document.getElementById('ventaMaterialForm').addEventListener('submit', handleVentaMaterialPost);
    
    document.getElementById('cargarMaterialesBtn').addEventListener('click', cargarInventarioMateriales);

    // Resúmenes
    document.getElementById('resumenVentasBtn').addEventListener('click', () => loadSummary('Ventas'));
    document.getElementById('resumenComprasBtn').addEventListener('click', () => loadSummary('Compras'));

    // Dashboard
    document.getElementById('cargarInventarioBtn').addEventListener('click', loadInventario);
    document.getElementById('cargarDatosGraficosBtn').addEventListener('click', handleLoadDashboard);
    document.getElementById('calcularResumenBtn').addEventListener('click', calcularResumenFinanciero);
}

// ═══════════════════════════════════════════════════════════════════════════
// ♻️ MATERIALES RECICLABLES - REGISTRO
// ═══════════════════════════════════════════════════════════════════════════

async function handleMaterialPost(e) {
    e.preventDefault();
    const form = e.target;
    const statusDiv = 'statusMaterial';
    
    displayStatus(statusDiv, 'info', 'Registrando material...');

    const materialData = {
        action: 'agregarMaterial',
        nombre: document.getElementById('mat_nombre').value,
        tipo: document.getElementById('mat_tipo').value,
        precio_kg: document.getElementById('mat_precio_kg').value,
        descripcion: document.getElementById('mat_descripcion').value
    };

    try {
        const response = await fetch(SCRIPT_URL, {
            method: 'POST',
            body: JSON.stringify(materialData),
            headers: { 'Content-Type': 'text/plain;charset=utf-8' }
        });
        const data = await response.json();

        if (data.status === 'success') {
            displayStatus(statusDiv, 'success', data.message);
            form.reset();
            cargarMateriales();
        } else {
            displayStatus(statusDiv, 'error', data.message);
        }
    } catch (error) {
        displayStatus(statusDiv, 'error', `Error de conexión: ${error.message}`);
    }
}

async function cargarMateriales() {
    try {
        const response = await fetch(`${SCRIPT_URL}?action=getMateriales`);
        const data = await response.json();

        if (data.status === 'success' && data.data && data.data.length > 0) {
            const listaMateriales = document.getElementById('listaMateriales');
            
            const materialesHtml = data.data.map(mat => {
                const icono = {
                    'Metal': '🔩',
                    'Plástico': '♻️',
                    'Vidrio': '🥤',
                    'Papel/Cartón': '📄',
                    'Electrónico': '🔌',
                    'Otro': '📦'
                }[mat.tipo] || '📦';

                return `
                    <li style="background: var(--bg-card); padding: 1rem 1.5rem; border-radius: 12px; border: 1px solid var(--border-color); transition: all 0.3s ease;">
                        <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.5rem;">
                            <span style="font-size: 1.5rem;">${icono}</span>
                            <strong style="color: var(--primary-color);">${mat.nombre}</strong>
                        </div>
                        <p style="color: var(--text-secondary); font-size: 0.9rem; margin: 0.25rem 0;">
                            <strong>ID:</strong> ${mat.id}
                        </p>
                        <p style="color: var(--text-secondary); font-size: 0.9rem; margin: 0.25rem 0;">
                            <strong>Tipo:</strong> ${mat.tipo}
                        </p>
                        <p style="color: var(--secondary-color); font-size: 1.1rem; font-weight: bold; margin-top: 0.5rem;">
                            $${parseFloat(mat.precio_kg).toFixed(2)}/kg
                        </p>
                        ${mat.descripcion ? `<p style="color: var(--text-secondary); font-size: 0.85rem; font-style: italic; margin-top: 0.5rem;">${mat.descripcion}</p>` : ''}
                    </li>
                `;
            }).join('');
            
            listaMateriales.innerHTML = materialesHtml;
        } else {
            document.getElementById('listaMateriales').innerHTML = '<li>No hay materiales registrados. Agrega uno arriba.</li>';
        }
    } catch (error) {
        console.error('Error al cargar materiales:', error);
        document.getElementById('listaMateriales').innerHTML = '<li>Error al cargar materiales.</li>';
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// 🛒 COMPRA DE MATERIALES
// ═══════════════════════════════════════════════════════════════════════════

async function handleMaterialQueryFilter(e) {
    const query = e.target.value.trim();
    const detailDiv = document.getElementById('cm_material_details');
    const submitBtn = document.getElementById('cm_submit_btn');
    const materialIdInput = document.getElementById('cm_material_id');

    if (query.length < 2) {
        detailDiv.classList.add('hidden');
        submitBtn.disabled = true;
        materialIdInput.value = '';
        return;
    }

    if (materialDataCache[query]) {
        displayMaterialDetails(materialDataCache[query], 'cm');
        return;
    }

    try {
        const response = await fetch(`${SCRIPT_URL}?action=buscarMaterial&query=${encodeURIComponent(query)}`);
        const data = await response.json();

        if (data.status === 'success' && data.data && data.data.length > 0) {
            const material = data.data[0];
            materialDataCache[query] = material;
            displayMaterialDetails(material, 'cm');
        } else {
            detailDiv.innerHTML = '<p style="color: var(--warning-color);">⚠️ Material no encontrado.</p>';
            detailDiv.classList.remove('hidden');
            submitBtn.disabled = true;
            materialIdInput.value = '';
        }
    } catch (error) {
        detailDiv.innerHTML = '<p style="color: var(--danger-color);">❌ Error de conexión.</p>';
        detailDiv.classList.remove('hidden');
        submitBtn.disabled = true;
    }
}

function displayMaterialDetails(material, prefix) {
    const detailDiv = document.getElementById(`${prefix}_material_details`);
    const submitBtn = document.getElementById(`${prefix}_submit_btn`);
    const materialIdInput = document.getElementById(`${prefix}_material_id`);
    const precioKgInput = document.getElementById(`${prefix}_precio_kg`);

    const icono = {
        'Metal': '🔩',
        'Plástico': '♻️',
        'Vidrio': '🥤',
        'Papel/Cartón': '📄',
        'Electrónico': '🔌',
        'Otro': '📦'
    }[material.tipo] || '📦';

    const tipoTransaccion = prefix === 'cm' ? 'Compra' : 'Venta';

    detailDiv.innerHTML = `
        <h4 style="color: var(--primary-color); margin-bottom: 1rem;">
            ${icono} Material Encontrado - ${tipoTransaccion}
        </h4>
        <p><strong>Nombre:</strong> ${material.nombre}</p>
        <p><strong>ID:</strong> ${material.id}</p>
        <p><strong>Tipo:</strong> ${material.tipo}</p>
        <p><strong>Precio base:</strong> $${parseFloat(material.precio_kg).toFixed(2)}/kg</p>
        ${material.descripcion ? `<p><strong>Descripción:</strong> ${material.descripcion}</p>` : ''}
    `;
    
    detailDiv.classList.remove('hidden');
    materialIdInput.value = material.id;
    
    if (!precioKgInput.value) {
        precioKgInput.value = parseFloat(material.precio_kg).toFixed(2);
    }
    
    submitBtn.disabled = false;
    
    if (prefix === 'cm') {
        updateCompraMaterialPreview();
    } else {
        updateVentaMaterialPreview();
    }
}

function updateCompraMaterialPreview() {
    const pesoGramos = parseFloat(document.getElementById('cm_peso_gramos').value) || 0;
    const precioKg = parseFloat(document.getElementById('cm_precio_kg').value) || 0;
    const previewDiv = document.getElementById('cm_preview');

    if (pesoGramos > 0 && precioKg > 0) {
        const pesoKg = pesoGramos / 1000;
        const total = pesoKg * precioKg;

        document.getElementById('preview_peso').textContent = pesoGramos.toFixed(0);
        document.getElementById('preview_kg').textContent = pesoKg.toFixed(3);
        document.getElementById('preview_precio_kg').textContent = precioKg.toFixed(2);
        document.getElementById('preview_total').textContent = total.toFixed(2);

        previewDiv.style.display = 'block';
    } else {
        previewDiv.style.display = 'none';
    }
}

async function handleCompraMaterialPost(e) {
    e.preventDefault();
    const form = e.target;
    const statusDiv = 'statusCompraMaterial';
    const submitBtn = document.getElementById('cm_submit_btn');
    
    submitBtn.disabled = true;
    displayStatus(statusDiv, 'info', 'Registrando compra de material...');

    const materialId = document.getElementById('cm_material_id').value;
    
    if (!materialId) {
        displayStatus(statusDiv, 'error', 'No hay material seleccionado. Busque y seleccione uno.');
        submitBtn.disabled = false;
        return;
    }

    const compraData = {
        action: 'registrarCompraMaterial',
        material_id: materialId,
        peso_gramos: document.getElementById('cm_peso_gramos').value,
        precio_kg: document.getElementById('cm_precio_kg').value,
        proveedor: document.getElementById('cm_proveedor').value
    };

    try {
        const response = await fetch(SCRIPT_URL, {
            method: 'POST',
            body: JSON.stringify(compraData),
            headers: { 'Content-Type': 'text/plain;charset=utf-8' }
        });
        const data = await response.json();

        if (data.status === 'success') {
            displayStatus(statusDiv, 'success', data.message);
            form.reset();
            delete materialDataCache[materialId];
            document.getElementById('cm_material_details').classList.add('hidden');
            document.getElementById('cm_preview').style.display = 'none';
        } else {
            displayStatus(statusDiv, 'error', data.message);
        }
    } catch (error) {
        displayStatus(statusDiv, 'error', `Error de conexión: ${error.message}`);
    } finally {
        submitBtn.disabled = false;
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// 💵 VENTA DE MATERIALES
// ═══════════════════════════════════════════════════════════════════════════

async function handleVentaMaterialQueryFilter(e) {
    const query = e.target.value.trim();
    const detailDiv = document.getElementById('vm_material_details');
    const submitBtn = document.getElementById('vm_submit_btn');
    const materialIdInput = document.getElementById('vm_material_id');

    if (query.length < 2) {
        detailDiv.classList.add('hidden');
        submitBtn.disabled = true;
        materialIdInput.value = '';
        return;
    }

    if (materialDataCache[query]) {
        displayMaterialDetails(materialDataCache[query], 'vm');
        return;
    }

    try {
        const response = await fetch(`${SCRIPT_URL}?action=buscarMaterial&query=${encodeURIComponent(query)}`);
        const data = await response.json();

        if (data.status === 'success' && data.data && data.data.length > 0) {
            const material = data.data[0];
            materialDataCache[query] = material;
            displayMaterialDetails(material, 'vm');
        } else {
            detailDiv.innerHTML = '<p style="color: var(--warning-color);">⚠️ Material no encontrado.</p>';
            detailDiv.classList.remove('hidden');
            submitBtn.disabled = true;
            materialIdInput.value = '';
        }
    } catch (error) {
        detailDiv.innerHTML = '<p style="color: var(--danger-color);">❌ Error de conexión.</p>';
        detailDiv.classList.remove('hidden');
        submitBtn.disabled = true;
    }
}

function updateVentaMaterialPreview() {
    const pesoGramos = parseFloat(document.getElementById('vm_peso_gramos').value) || 0;
    const precioKg = parseFloat(document.getElementById('vm_precio_kg').value) || 0;
    const previewDiv = document.getElementById('vm_preview');

    if (pesoGramos > 0 && precioKg > 0) {
        const pesoKg = pesoGramos / 1000;
        const total = pesoKg * precioKg;

        document.getElementById('vm_preview_peso').textContent = pesoGramos.toFixed(0);
        document.getElementById('vm_preview_kg').textContent = pesoKg.toFixed(3);
        document.getElementById('vm_preview_precio_kg').textContent = precioKg.toFixed(2);
        document.getElementById('vm_preview_total').textContent = total.toFixed(2);

        previewDiv.style.display = 'block';
    } else {
        previewDiv.style.display = 'none';
    }
}

async function handleVentaMaterialPost(e) {
    e.preventDefault();
    const form = e.target;
    const statusDiv = 'statusVentaMaterial';
    const submitBtn = document.getElementById('vm_submit_btn');
    
    submitBtn.disabled = true;
    displayStatus(statusDiv, 'info', 'Registrando venta de material...');

    const materialId = document.getElementById('vm_material_id').value;
    
    if (!materialId) {
        displayStatus(statusDiv, 'error', 'No hay material seleccionado. Busque y seleccione uno.');
        submitBtn.disabled = false;
        return;
    }

    const ventaData = {
        action: 'registrarVentaMaterial',
        material_id: materialId,
        peso_gramos: document.getElementById('vm_peso_gramos').value,
        precio_kg: document.getElementById('vm_precio_kg').value,
        cliente: document.getElementById('vm_cliente').value
    };

    try {
        const response = await fetch(SCRIPT_URL, {
            method: 'POST',
            body: JSON.stringify(ventaData),
            headers: { 'Content-Type': 'text/plain;charset=utf-8' }
        });
        const data = await response.json();

        if (data.status === 'success') {
            displayStatus(statusDiv, 'success', data.message);
            form.reset();
            delete materialDataCache[materialId];
            document.getElementById('vm_material_details').classList.add('hidden');
            document.getElementById('vm_preview').style.display = 'none';
            submitBtn.disabled = true;
        } else {
            displayStatus(statusDiv, 'error', data.message);
            submitBtn.disabled = false;
        }
    } catch (error) {
        displayStatus(statusDiv, 'error', `Error de conexión: ${error.message}`);
        submitBtn.disabled = false;
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// 📊 INVENTARIO DE MATERIALES
// ═══════════════════════════════════════════════════════════════════════════

async function cargarInventarioMateriales() {
    displayStatus('statusInventarioMateriales', 'info', 'Cargando inventario de materiales...');
    const tableBody = document.getElementById('materialesTableBody');
    tableBody.innerHTML = '<tr><td colspan="6">Cargando...</td></tr>';

    try {
        const [materialesResponse, comprasResponse, ventasResponse] = await Promise.all([
            fetch(`${SCRIPT_URL}?action=getMateriales`),
            fetch(`${SCRIPT_URL}?action=getData&sheetName=ComprasMateriales`),
            fetch(`${SCRIPT_URL}?action=getData&sheetName=VentasMateriales`)
        ]);

        const materialesData = await materialesResponse.json();
        const comprasData = await comprasResponse.json();
        const ventasData = await ventasResponse.json();

        if (materialesData.status === 'success' && materialesData.data && materialesData.data.length > 0) {
            const materiales = materialesData.data;
            const stockMap = new Map();
            
            if (comprasData.status === 'success' && comprasData.data) {
                comprasData.data.forEach(compra => {
                    const materialId = compra.material_id;
                    const pesoKg = parseFloat(compra.peso_kg) || 0;
                    
                    if (!stockMap.has(materialId)) {
                        stockMap.set(materialId, 0);
                    }
                    stockMap.set(materialId, stockMap.get(materialId) + pesoKg);
                });
            }

            if (ventasData.status === 'success' && ventasData.data) {
                ventasData.data.forEach(venta => {
                    const materialId = venta.material_id;
                    const pesoKg = parseFloat(venta.peso_kg) || 0;
                    
                    if (!stockMap.has(materialId)) {
                        stockMap.set(materialId, 0);
                    }
                    stockMap.set(materialId, stockMap.get(materialId) - pesoKg);
                });
            }

            const tableHtml = materiales.map(material => {
                const stockKg = stockMap.get(material.id) || 0;
                const precioKg = parseFloat(material.precio_kg) || 0;
                const valorTotal = stockKg * precioKg;

                const icono = {
                    'Metal': '🔩',
                    'Plástico': '♻️',
                    'Vidrio': '🥤',
                    'Papel/Cartón': '📄',
                    'Electrónico': '🔌',
                    'Otro': '📦'
                }[material.tipo] || '📦';

                const stockStyle = stockKg < 5 ? 'style="color: var(--danger-color); font-weight: bold;"' : '';

                return `
                    <tr>
                        <td>${material.id}</td>
                        <td>${icono} ${material.nombre}</td>
                        <td>${material.tipo}</td>
                        <td>$${precioKg.toFixed(2)}</td>
                        <td ${stockStyle}>${stockKg.toFixed(3)} kg</td>
                        <td>$${valorTotal.toFixed(2)}</td>
                    </tr>
                `;
            }).join('');

            tableBody.innerHTML = tableHtml;
            displayStatus('statusInventarioMateriales', 'success', `Inventario cargado: ${materiales.length} materiales registrados.`);
        } else {
            displayStatus('statusInventarioMateriales', 'warning', 'No hay materiales registrados.');
            tableBody.innerHTML = '<tr><td colspan="6">No hay materiales en el inventario.</td></tr>';
        }
    } catch (error) {
        displayStatus('statusInventarioMateriales', 'error', `Error al cargar inventario: ${error.message}`);
        tableBody.innerHTML = '<tr><td colspan="6">Error al cargar datos.</td></tr>';
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// 📊 DASHBOARD
// ═══════════════════════════════════════════════════════════════════════════

async function handleLoadDashboard() {
    await calcularResumenFinanciero();
    await cargarMetricasMateriales();
    await cargarDatosGraficos();
}

async function calcularResumenFinanciero() {
    displayStatus('statusDashboard', 'info', 'Calculando resumen financiero...');
    
    try {
        const [ventasResponse, comprasResponse] = await Promise.all([
            fetch(`${SCRIPT_URL}?action=getData&sheetName=Ventas`),
            fetch(`${SCRIPT_URL}?action=getData&sheetName=Compras`)
        ]);

        const ventasData = await ventasResponse.json();
        const comprasData = await comprasResponse.json();

        let totalVentas = 0;
        let totalCompras = 0;

        if (ventasData.status === 'success' && ventasData.data) {
            totalVentas = ventasData.data.reduce((sum, venta) => {
                return sum + (parseFloat(venta.cantidad) * parseFloat(venta.precio_venta));
            }, 0);
        }

        if (comprasData.status === 'success' && comprasData.data) {
            totalCompras = comprasData.data.reduce((sum, compra) => {
                return sum + (parseFloat(compra.cantidad) * parseFloat(compra.precio_compra));
            }, 0);
        }

        const ganancias = totalVentas - totalCompras;

        document.getElementById('totalVentas').textContent = `$${totalVentas.toFixed(2)}`;
        document.getElementById('totalCompras').textContent = `$${totalCompras.toFixed(2)}`;
        document.getElementById('totalGanancias').textContent = `$${ganancias.toFixed(2)}`;
        document.getElementById('totalGastos').textContent = `$${totalCompras.toFixed(2)}`;

        const gananciasElement = document.getElementById('totalGanancias');
        if (ganancias > 0) {
            gananciasElement.style.color = 'var(--secondary-color)';
        } else if (ganancias < 0) {
            gananciasElement.style.color = 'var(--danger-color)';
        } else {
            gananciasElement.style.color = '#666';
        }

        displayStatus('statusDashboard', 'success', `Resumen calculado correctamente.`);

        return { totalVentas, totalCompras, ganancias };
    } catch (error) {
        displayStatus('statusDashboard', 'error', `Error al calcular resumen: ${error.message}`);
        return null;
    }
}

async function cargarMetricasMateriales() {
    try {
        const response = await fetch(`${SCRIPT_URL}?action=getMetricasMateriales`);
        const data = await response.json();

        if (data.status === 'success' && data.data) {
            const metricas = data.data;

            document.getElementById('totalInvertidoMateriales').textContent = `$${metricas.totalInvertido.toFixed(2)}`;
            document.getElementById('totalVendidoMateriales').textContent = `$${metricas.totalVendido.toFixed(2)}`;
            document.getElementById('valorInventarioMateriales').textContent = `$${metricas.valorInventario.toFixed(2)}`;
            document.getElementById('materialMasComprado').textContent = metricas.materialMasComprado;

            const gananciaElement = document.getElementById('gananciaMateriales');
            gananciaElement.textContent = `$${metricas.ganancia.toFixed(2)}`;
            
            if (metricas.ganancia > 0) {
                gananciaElement.style.color = 'var(--secondary-color)';
            } else if (metricas.ganancia < 0) {
                gananciaElement.style.color = 'var(--danger-color)';
            } else {
                gananciaElement.style.color = '#666';
            }

            crearGraficaMateriaPorTipo(metricas.comprasPorTipo);
        }
    } catch (error) {
        console.error('Error al cargar métricas de materiales:', error);
    }
}

function crearGraficaMateriaPorTipo(comprasPorTipo) {
    const ctx = document.getElementById('materialesChart');
    if (!ctx) return;

    if (materialesChart) {
        materialesChart.destroy();
    }

    const tipos = Object.keys(comprasPorTipo);
    const cantidades = Object.values(comprasPorTipo);

    if (tipos.length === 0) return;

    const colores = {
        'Metal': 'rgba(139, 92, 246, 0.7)',
        'Plástico': 'rgba(16, 185, 129, 0.7)',
        'Vidrio': 'rgba(59, 130, 246, 0.7)',
        'Papel/Cartón': 'rgba(245, 158, 11, 0.7)',
        'Electrónico': 'rgba(239, 68, 68, 0.7)',
        'Otro': 'rgba(156, 163, 175, 0.7)'
    };

    const backgroundColors = tipos.map(tipo => colores[tipo] || 'rgba(156, 163, 175, 0.7)');

    materialesChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: tipos,
            datasets: [{
                label: 'Compras por Tipo',
                data: cantidades,
                backgroundColor: backgroundColors,
                borderColor: backgroundColors.map(c => c.replace('0.7', '1')),
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: { color: '#f1f5f9' }
                },
                title: {
                    display: true,
                    text: 'Compras por Tipo de Material',
                    color: '#f1f5f9',
                    font: { size: 16 }
                }
            }
        }
    });
}

async function cargarDatosGraficos() {
    try {
        const resumen = await calcularResumenFinanciero();
        
        if (!resumen) return;

        const ctx1 = document.getElementById('resumenFinancieroChart');
        if (ctx1) {
            if (resumenFinancieroChart) {
                resumenFinancieroChart.destroy();
            }
            
            resumenFinancieroChart = new Chart(ctx1, {
                type: 'bar',
                data: {
                    labels: ['Ventas', 'Compras', 'Ganancias'],
                    datasets: [{
                        label: 'Resumen Financiero ($)',
                        data: [resumen.totalVentas, resumen.totalCompras, resumen.ganancias],
                        backgroundColor: [
                            'rgba(16, 185, 129, 0.7)',
                            'rgba(59, 130, 246, 0.7)',
                            'rgba(139, 92, 246, 0.7)'
                        ],
                        borderColor: [
                            'rgba(16, 185, 129, 1)',
                            'rgba(59, 130, 246, 1)',
                            'rgba(139, 92, 246, 1)'
                        ],
                        borderWidth: 2
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            labels: { color: '#f1f5f9' }
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            ticks: { color: '#cbd5e1' },
                            grid: { color: 'rgba(139, 92, 246, 0.1)' }
                        },
                        x: {
                            ticks: { color: '#cbd5e1' },
                            grid: { color: 'rgba(139, 92, 246, 0.1)' }
                        }
                    }
                }
            });
        }
    } catch (error) {
        console.error('Error en gráficos:', error);
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// 📦 FUNCIONES DE PRODUCTOS
// ═══════════════════════════════════════════════════════════════════════════

async function handlePostAction(e, action, statusDivId) {
    e.preventDefault();
    const form = e.target;
    displayStatus(statusDivId, 'info', 'Procesando...');

    const data = { action };
    
    // Obtener datos según la acción
    if (action === 'agregarCategoria') {
        // Para categorías
        data.nombre = document.getElementById('c_nombre').value;
    } else if (action === 'agregarProducto') {
        // Para productos
        data.codigo = document.getElementById('p_codigo').value;
        data.nombre = document.getElementById('p_nombre').value;
        data.categoria = document.getElementById('p_categoria').value;
        data.precio_compra = document.getElementById('p_precio_compra').value;
        data.precio_venta = document.getElementById('p_precio_venta').value;
        data.stock = document.getElementById('p_stock').value;
    }

    try {
        const response = await fetch(SCRIPT_URL, {
            method: 'POST',
            body: JSON.stringify(data),
            headers: { 'Content-Type': 'text/plain;charset=utf-8' }
        });
        const result = await response.json();

        if (result.status === 'success') {
            displayStatus(statusDivId, 'success', result.message);
            form.reset();
            if (action === 'agregarCategoria') {
                loadInitialData();
            }
        } else {
            displayStatus(statusDivId, 'error', result.message);
        }
    } catch (error) {
        displayStatus(statusDivId, 'error', `Error de conexión: ${error.message}`);
    }
}

async function handleQueryFilter(query, prefix) {
    const detailDiv = document.getElementById(`${prefix}_product_details`);
    const submitBtn = document.getElementById(`${prefix}_submit_btn`);
    const productIdInput = document.getElementById(`${prefix}_producto_id`);

    if (query.trim().length < 2) {
        detailDiv.classList.add('hidden');
        submitBtn.disabled = true;
        productIdInput.value = '';
        return;
    }

    if (productDataCache[query]) {
        displayProductDetails(productDataCache[query], prefix);
        return;
    }

    try {
        const response = await fetch(`${SCRIPT_URL}?action=buscarProducto&query=${encodeURIComponent(query)}`);
        const data = await response.json();

        if (data.status === 'success' && data.data && data.data.length > 0) {
            const product = data.data[0];
            productDataCache[query] = product;
            displayProductDetails(product, prefix);
        } else {
            detailDiv.innerHTML = '<p style="color: var(--warning-color);">⚠️ Producto no encontrado.</p>';
            detailDiv.classList.remove('hidden');
            submitBtn.disabled = true;
            productIdInput.value = '';
        }
    } catch (error) {
        detailDiv.innerHTML = '<p style="color: var(--danger-color);">❌ Error de conexión.</p>';
        detailDiv.classList.remove('hidden');
        submitBtn.disabled = true;
    }
}

function displayProductDetails(product, prefix) {
    const detailDiv = document.getElementById(`${prefix}_product_details`);
    const submitBtn = document.getElementById(`${prefix}_submit_btn`);
    const productIdInput = document.getElementById(`${prefix}_producto_id`);
    const isCompra = prefix === 'co';

    detailDiv.innerHTML = `
        <h4 style="color: var(--primary-color);">✅ Producto Encontrado</h4>
        <p><strong>Nombre:</strong> ${product.nombre}</p>
        <p><strong>ID:</strong> ${product.id}</p>
        <p><strong>Código:</strong> ${product.código}</p>
        <p><strong>Stock:</strong> ${product.stock} unidades</p>
        <p><strong>Precio ${isCompra ? 'Compra' : 'Venta'}:</strong> $${(isCompra ? product.precio_compra : product.precio_venta).toFixed(2)}</p>
    `;
    
    detailDiv.classList.remove('hidden');
    productIdInput.value = product.id;
    
    const precioInput = document.getElementById(`${prefix}_precio_${isCompra ? 'compra' : 'venta'}`);
    if (!precioInput.value) {
        precioInput.value = (isCompra ? product.precio_compra : product.precio_venta).toFixed(2);
    }
    
    submitBtn.disabled = false;
    
    if (!isCompra && product.stock < 5) {
        detailDiv.innerHTML += `<p class="status-message warning" style="display:block; margin-top: 10px;">Stock bajo. Solo quedan ${product.stock} unidades.</p>`;
    }
}

async function handleTransactionPost(e, type) {
    e.preventDefault();
    const form = e.target;
    const prefix = type === 'compra' ? 'co' : 'v';
    const statusDivId = type === 'compra' ? 'statusCompra' : 'statusVenta';
    
    const submitBtn = document.getElementById(`${prefix}_submit_btn`);
    submitBtn.disabled = true;
    displayStatus(statusDivId, 'info', `Registrando ${type}...`);

    const productoId = document.getElementById(`${prefix}_producto_id`).value;
    
    if (!productoId) {
         displayStatus(statusDivId, 'error', `No hay producto seleccionado. Busque y seleccione uno.`);
         submitBtn.disabled = false;
         return;
    }

    const transaccionData = {
        action: 'registrarTransaccion',
        producto_id: productoId,
        cantidad: document.getElementById(`${prefix}_cantidad`).value,
        precio: document.getElementById(`${prefix}_precio_${type === 'compra' ? 'compra' : 'venta'}`).value,
        type: type,
        extra_data: document.getElementById(`${prefix}_${type === 'compra' ? 'proveedor' : 'cliente'}`).value,
    };

    try {
        const response = await fetch(SCRIPT_URL, {
            method: 'POST',
            body: JSON.stringify(transaccionData),
            headers: { 'Content-Type': 'text/plain;charset=utf-8' }
        });
        const data = await response.json();

        if (data.status === 'success') {
            displayStatus(statusDivId, 'success', data.message);
            form.reset(); 
            delete productDataCache[productoId]; 
            document.getElementById(`${prefix}_product_details`).classList.add('hidden');
        } else {
            displayStatus(statusDivId, 'error', data.message);
        }
    } catch (error) {
        displayStatus(statusDivId, 'error', `Error de conexión: ${error.message}`);
    } finally {
        submitBtn.disabled = false;
    }
}

async function loadInventario() {
    displayStatus('statusInventario', 'info', 'Cargando datos de inventario...');
    const tableBody = document.getElementById('inventarioTableBody');
    tableBody.innerHTML = '<tr><td colspan="6">Cargando...</td></tr>';

    try {
        const response = await fetch(`${SCRIPT_URL}?action=getInventario`);
        const data = await response.json();

        if (data.status === 'success' && data.data && data.data.length > 0) {
            displayStatus('statusInventario', 'success', `Inventario cargado: ${data.data.length} productos.`);
            tableBody.innerHTML = data.data.map(p => {
                const stockStyle = p.stock < 5 ? 'style="color: var(--danger-color); font-weight: bold;"' : '';
                return `
                    <tr>
                        <td>${p.id}</td>
                        <td>${p.nombre}</td>
                        <td>${p.código}</td>
                        <td>${p.categoría}</td>
                        <td ${stockStyle}>${p.stock}</td>
                        <td>$${p.precio_venta.toFixed(2)}</td>
                    </tr>
                `;
            }).join('');
        } else {
            displayStatus('statusInventario', 'warning', data.message);
            tableBody.innerHTML = '<tr><td colspan="6">No hay productos en inventario.</td></tr>';
        }
    } catch (error) {
        displayStatus('statusInventario', 'error', `Error al cargar inventario: ${error.message}`);
        tableBody.innerHTML = '<tr><td colspan="6">Error al cargar datos.</td></tr>';
    }
}

async function loadSummary(type) {
    const sheetName = type === 'Ventas' ? 'Ventas' : 'Compras';
    displayStatus('statusResumen', 'info', `Cargando resumen de ${sheetName}...`);
    const table = document.getElementById('resumenTable');
    const tableHead = table.querySelector('thead');
    const tableBody = document.getElementById('resumenTableBody');
    table.classList.add('hidden');
    tableBody.innerHTML = '';

    try {
        const response = await fetch(`${SCRIPT_URL}?action=getData&sheetName=${sheetName}`);
        const data = await response.json();

        if (data.status === 'success' && data.data.length > 0) {
            displayStatus('statusResumen', 'success', `${data.data.length} ${sheetName} registradas.`);
            table.classList.remove('hidden');
            
            const headers = Object.keys(data.data[0]).map(h => `<th>${h.toUpperCase().replace('_', ' ')}</th>`).join('');
            tableHead.innerHTML = `<tr>${headers}</tr>`;

            tableBody.innerHTML = data.data.map(row => {
                const cells = Object.values(row).map(value => {
                    if (value instanceof Date) {
                        value = value.toLocaleDateString();
                    } else if (typeof value === 'number') {
                        value = value.toFixed(2);
                    }
                    return `<td>${value}</td>`;
                }).join('');
                return `<tr>${cells}</tr>`;
            }).join('');

        } else {
            displayStatus('statusResumen', 'warning', `No hay datos en la pestaña ${sheetName}.`);
        }
    } catch (error) {
        displayStatus('statusResumen', 'error', `Error al cargar resumen: ${error.message}`);
    }
}

async function handleConfigAction(action) {
    setButtonState(true);
    displayStatus('statusConfig', 'info', `Procesando la acción de ${action}...`);

    try {
        const response = await fetch(`${SCRIPT_URL}?action=${action}`);
        const data = await response.json();

        if (data.status === 'success') {
            displayStatus('statusConfig', 'success', data.message);
            loadInitialData();
        } else {
            displayStatus('statusConfig', 'error', data.message);
        }
    } catch (error) {
        displayStatus('statusConfig', 'error', `Error de conexión: ${error.message}.`);
    } finally {
        setButtonState(false);
    }
}

function setButtonState(disabled) {
    document.getElementById('iniciarDBBtn').disabled = disabled;
    document.getElementById('resetDBBtn').disabled = disabled;
}

function displayStatus(elementId, type, message) {
    const el = document.getElementById(elementId);
    if (!el) return;
    el.style.display = 'block';
    el.className = `status-message ${type}`;
    el.innerHTML = `<i class="fas fa-${type === 'success' ? 'check' : type === 'error' ? 'times' : type === 'warning' ? 'exclamation-triangle' : 'info'}-circle"></i> ${message}`;
}
