# Plan de implementación — Rediseño UX/UI de BIEM Cotiza

## Modo y contratos preservados

**Modo:** Rediseño · Preservación. La aplicación conservará rutas, persistencia con AsyncStorage, modelos de productos/clientes/cotizaciones, fórmulas de precios, generación PDF, compartición y el flujo de cotizar sin cliente o catálogo previo.

**Preservar:** identidad BIEM, azul corporativo, navegación móvil de cinco destinos, rutas `/`, `/cotizaciones`, `/historial`, `/clientes`, `/calculadora` y `/negocio`, claves de estado persistente, PDF y acciones de cotización.

**Mejorar:** jerarquía, densidad visual, superficie de escritorio, navegación por dispositivo, búsqueda global, estados de los módulos y trazabilidad comercial.

**Eliminar:** barras de progreso sin relación explícita con una métrica y controles sin una acción concreta.

**Mayor riesgo:** introducir el escritorio sin alterar el comportamiento táctil ni los enlaces de Expo Router. La capa de layout será condicional por ancho, sin cambiar los destinos de las rutas.

## Design Read

- **Artefacto:** espacio de trabajo SaaS responsive para cotizaciones y seguimiento comercial.
- **Audiencia:** emprendedores y pequeños negocios que deben cotizar y decidir en minutos, sin sentirse dentro de un sistema administrativo complejo.
- **Lenguaje visual:** SaaS operativo de información clara, inspirado en productos B2B de navegación estable y alta legibilidad.
- **Diales:** variación visual 4, movimiento 3, densidad 7, dependencia de activos 2, fidelidad de marca 9.
- **Restricciones:** React Native/Expo, una mano en móvil, datos comerciales persistentes reales; los datos de muestra existentes solo se visualizan como datos del proyecto y no se inventan nuevas métricas.

## Diseño

- **Movimiento de diseño:** arquitectura de información editorial para SaaS, con una espina estable de navegación, tarjetas discretas y bloques de decisión compactos.
- **Principios:** priorizar la acción siguiente; revelar complejidad progresivamente; usar datos verificables; diferenciar estados y decisiones con color semántico.
- **Filosofía de color:** azul BIEM `#087DBB` para intención y foco; azul oscuro `#172B49` para tipografía y estructura; gris azulado `#F6F9FC` para descanso visual; blanco para superficies; amarillo suave, verde y violeta para estados comerciales distinguibles.
- **Paradigma de layout:** en escritorio, rail lateral persistente + barra superior de búsqueda y usuario; en móvil, navegación inferior fija de cinco accesos y utilidades secundarias bajo Configuración. El contenido mantiene una columna estrecha en móvil y una superficie de trabajo limitada en escritorio.
- **Elementos firma:** sello documental BIEM, píldoras de estado de alta legibilidad y un banner compacto de oportunidad con un degradado azul muy sutil.
- **Interacción:** CTA principal siempre visible; acciones de baja prioridad en textos o menús contextualizados; confirmaciones breves después de guardar; filtros y estados con selección explícita.
- **Animación:** respuesta de presión y transiciones de estado de 160–220 ms; sin movimiento continuo; compatible con preferencias de reducción de movimiento.
- **Tipografía:** sistema nativo limpio con jerarquía equivalente a Inter; títulos en 26–30 px en móvil y 30–34 px en escritorio, cuerpo en 13–15 px, etiquetas de 10–11 px con espaciado controlado.
- **Esencia de marca:** BIEM Cotiza transforma una propuesta comercial en una decisión clara para pequeños negocios.
- **Personalidad:** precisa, confiable, cercana.
- **Voz:** directa y orientada a avance. Ejemplos: “Crea una cotización en minutos.” y “Tus propuestas abiertas, en un solo lugar.”
- **Logotipo y color firma:** mantener el sello documental BIEM existente; azul BIEM `#087DBB` como firma inequívoca.

## Implementación

1. Centralizar tokens visuales y crear una envoltura responsive que añada rail lateral, barra superior, búsqueda funcional y menú de usuario únicamente en escritorio; ocultar la barra de pestañas de Expo cuando el rail esté activo.
2. Conservar los cinco accesos móviles y ubicar Productos y servicios y Reportes como destinos secundarios accesibles desde Configuración o el rail de escritorio.
3. Rediseñar Inicio como espacio comercial: bienvenida y fecha, banner reducido con CTA blanco, cuatro métricas semánticas, valor en seguimiento calculado solo con cotizaciones abiertas, y últimas cotizaciones con acciones reales.
4. Incorporar Reportes con cálculos derivados de cotizaciones persistidas: valor abierto, aprobadas, completadas, tasa de aprobación y distribución de estados. Si no existe información suficiente, mostrar estado vacío explícito.
5. Reforzar el creador rápido y el historial sin modificar las fórmulas ni las operaciones actuales: cliente opcional/manual, ítems de catálogo o manuales, impuestos/descuentos, documento y acciones.
6. Usar Lucide para la iconografía de la nueva capa de navegación y utilidades, conservando los iconos existentes donde se integren con la capa nativa de Expo.

## Estructura

| Ruta o módulo | Responsabilidad |
| --- | --- |
| `components/biem-ui.tsx` | Tokens, primitivas visuales y shell responsive con navegación y búsqueda. |
| `app/(tabs)/_layout.tsx` | Pestañas móviles y ocultamiento del tab bar para escritorio. |
| `app/(tabs)/index.tsx` | Espacio de trabajo comercial y últimas cotizaciones. |
| `app/(tabs)/reportes.tsx` | Reportes comerciales calculados desde el estado persistente. |
| `app/(tabs)/cotizaciones.tsx` | Creación, edición, PDF y compartición de propuestas. |
| `app/(tabs)/historial.tsx` | Seguimiento, filtros y cambios de estado. |
| `lib/biem/store.tsx` | Datos y operaciones persistentes existentes; sin ruptura de contratos. |
