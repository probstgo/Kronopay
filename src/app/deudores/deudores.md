La sección de **Gestión de Deudores** es donde los usuarios de tu plataforma de cobranza (PYMEs) administran la lista de personas o empresas que les deben dinero. Esta pantalla debe ser clara, funcional y fácil de usar, permitiendo a los usuarios ver, agregar, editar y eliminar deudores, además de importar listas grandes desde archivos CSV. Como estás usando **Next.js** y la librería **shadcn/ui**, aprovecharás componentes preestilizados (como tablas, formularios y botones) para que sea rápida de implementar y luzca profesional. A continuación, te explico en palabras simples cómo debe estar diseñada esta sección, enfocada en la experiencia del usuario y las funcionalidades clave.

### Descripción General
La pantalla de Gestión de Deudores es una vista central donde los usuarios:
- Ven una lista de todos sus deudores (filtrada automáticamente por su cuenta, gracias a Supabase y RLS).
- Pueden buscar, filtrar y ordenar deudores.
- Pueden agregar o editar datos de un deudor individual.
- Pueden importar múltiples deudores desde un archivo CSV.
- Tienen opciones para exportar datos o realizar acciones rápidas (como enviar un recordatorio).

La interfaz debe ser intuitiva, con un diseño limpio que combine una **tabla interactiva** para mostrar datos, un **botón prominente** para agregar/importar, y un **formulario modal** para entradas manuales. Usarás componentes de shadcn/ui como `<DataTable>`, `<Button>`, `<Dialog>` y `<Input>` para construir esto.

### Elementos Principales de la Pantalla
1. **Tabla de Deudores**:
   - Muestra una lista con columnas clave: Nombre, Rut, Email, Teléfono,  Monto de la Deuda, Fecha de Vencimiento, Estado.
   - Cada fila debe tener botones pequeños para acciones rápidas: "Editar", "Eliminar", "Enviar Recordatorio" (email o llamada).
   - Usa el componente `<DataTable>` de shadcn/ui para que sea responsiva (se adapta a móviles) y permita:
     - **Búsqueda**: Un campo arriba de la tabla para buscar por nombre, rut o email.
     - **Filtros**: Desplegables para filtrar por estado (e.g., "Solo vencidos") o rango de fechas.
     - **Ordenamiento**: Clic en encabezados de columnas para ordenar (e.g., por monto o fecha).
   - Añade un indicador visual para cada estado.
   - Incluye paginación si hay muchos deudores (e.g., 10 por página) y que tenga la opcion de elegir cuantas se ven por pagina (e.g. 10,30,50 por página).

2. **Botón de Agregar Deudor**:
   - Un botón grande en la esquina superior derecha (usa `<Button>` de shadcn/ui, variante "primary").
   - Al hacer clic, abre un **modal** (con `<Dialog>`) con un formulario para ingresar:
     - Nombre (obligatorio).
     - Rut
     - Teléfono (opcional, validado para formato).
     - Email (opcional, validado).
     - Monto de la deuda (número, obligatorio).
     - Fecha de vencimiento (usa un calendario de shadcn/ui, obligatorio).
     - Estado (seguir lineamientos de "estados_deudas.md)
   - Incluye botones "Guardar" y "Cancelar". Al guardar, los datos se envían a la tabla `deudores` en Supabase, vinculados al `usuario_id`.

3. **Importación de CSV**:
   - Otro botón cerca del de "Agregar" (e.g., `<Button variant="outline">Importar CSV</Button>`).
   - Al clicar, abre un modal donde el usuario sube un archivo CSV (usa `<Input type="file">`).
   - El CSV debe tener columnas claras: nombre,Rut, teléfono, email, monto, fecha_vencimiento.
   - El estado es "nueva" para todas las nuevas deudas que se agreguen desde csv
   - Muestra una previsualización de los datos importados antes de confirmar.
   - Al confirmar, los datos se insertan masivamente en Supabase (usa una API route en Next.js para procesar el archivo).

4. **Exportación de Datos**:
   - Un botón adicional (e.g., `<Button>Exportar</Button>`) para descargar la lista de deudores como CSV o PDF.
   - Esto es útil para reportes o backups. Filtra por los mismos criterios de la tabla (e.g., solo deudores vencidos).

5. **Acciones Rápidas por Deudor**:
   - En cada fila de la tabla, un botón "Enviar Recordatorio" que inicia una acción inmediata (email con Resend o llamada con Twilio).
   - Un botón "Editar" que abre el mismo modal del formulario, precargado con los datos del deudor.
   - Un botón "Eliminar" con confirmación (usa `<AlertDialog>` de shadcn/ui para evitar borrados accidentales).

### Flujo del Usuario
1. El usuario llega desde el Dashboard (clic en un enlace de la sidebar, `/deudores`).
2. Ve la tabla con sus deudores (cargada desde Supabase, filtrada por su `usuario_id`).
3. Puede:
   - Buscar/filtrar para encontrar un deudor específico.
   - Agregar un deudor manualmente (modal con formulario).
   - Importar una lista grande via CSV (modal con upload).
   - Editar/eliminar un deudor desde la tabla.
   - Enviar un recordatorio inmediato (se registra en la tabla `historial`).
4. Todas las acciones (agregar, editar, eliminar) actualizan la tabla en tiempo real (usa suscripciones de Supabase para reflejar cambios).

### Consideraciones de Diseño
- **Estilo con shadcn/ui**: Usa componentes como `<Card>` para envolver la tabla, `<Input>` para búsqueda, y `<DropdownMenu>` para filtros. Mantén colores neutros y accesibles (e.g., fondo claro, texto oscuro).
- **Responsividad**: Asegúrate de que la tabla se adapte a móviles (columnas colapsan en tarjetas o scroll horizontal).
- **Feedback al usuario**: Muestra notificaciones (con `<Toast>` de shadcn/ui) para confirmar acciones (e.g., "Deudor agregado con éxito").
- **Rendimiento**: Carga datos con paginación o lazy-loading para listas grandes (Next.js y Supabase lo soportan bien).
- **Seguridad**: Todas las queries a Supabase usan RLS, así que el usuario solo ve/sube sus propios deudores. No necesitas filtros manuales en el frontend.

### Ejemplo Visual
Imagina una pantalla con:
- **Encabezado**: Título "Gestión de Deudores" y botones "Agregar Deudor" e "Importar CSV" a la derecha.
- **Barra de búsqueda y filtros**: Justo encima de la tabla, con un campo de texto y un desplegable.
- **Tabla**: Filas con datos, colores para estados (rojo para vencido), y botones pequeños a la derecha de cada fila.
- **Modal**: Aparece al agregar/editar, con campos organizados y un diseño limpio (etiquetas claras, botones al final).
- **Toast**: Notificaciones flotantes para confirmar acciones o mostrar errores (e.g., "Email inválido").

### Próximos Pasos
- Usa Cursor para generar el componente de la tabla: Abre `app/deudores/page.tsx` y escribe "Crea una tabla con shadcn/ui DataTable para listar deudores desde Supabase". Ajusta el resultado para incluir filtros y acciones.
- Para el modal, usa "Crea un formulario en un Dialog de shadcn/ui para agregar deudor". Asegúrate de conectar con Supabase.
- Implementa primero la tabla y el formulario manual. Luego, añade importación CSV y exportación.

Esta sección es el núcleo de la plataforma, así que mantenla simple pero funcional. Si quieres detalles de otra pantalla o un flujo específico, dime.


















