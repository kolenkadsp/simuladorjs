# Simulador D'Hondt JS 2026 — Spec de Diseño

**Fecha:** 2026-03-31
**Contexto:** Juventud Socialista de Chile — Elecciones 2026
**Reglamento de referencia:** REGLAMENTO DE ELECCIONES JS 2026 (PDF)

---

## 1. Resumen

Interfaz web estática (HTML + JS + CSS, sin backend) para simular los resultados de las elecciones del **Comité Central Nacional** (CCN, 11 cupos) y **Comité Central Regional** (CCR, 30 cupos distribuidos en 16 regiones) de la Juventud Socialista de Chile 2026, aplicando el sistema D'Hondt con corrección de paridad de salida según el reglamento vigente.

**Nota padrón:** Tienen derecho a voto tanto los militantes **afiliados** (acreditados por el Servel) como los **adherentes** (menores de 18 años inscritos en los registros del Partido, art. 27). Los valores de padrón en el Cuadro I ya incluyen ambas categorías (columna TOTAL = Afiliados + Adherentes).

---

## 2. Alcance

- Simulación de CCN y CCR en la misma interfaz (pestañas)
- Ingreso manual de candidatos por el usuario
- Pactos/listas dinámicos: el usuario los crea por separado en cada contexto (CCN y cada región CCR)
- Sin persistencia de datos entre sesiones (se pierde al refrescar); el estado en memoria sí se conserva al cambiar de pestaña o región dentro de la misma sesión
- Solo dos géneros reconocidos para cálculo de paridad: Hombre / Mujer
- Padrón regional y cupos hardcodeados según Cuadro I del art. 34 (total afiliados + adherentes)

---

## 3. Archivos

```
index.html     — estructura HTML, pestañas, formularios
script.js      — lógica D'Hondt, paridad, renderizado de resultados
style.css      — estilos visuales
```

Sin dependencias externas requeridas. Se puede usar Tailwind CSS via CDN opcionalmente para estilos.

---

## 4. Estructura de la Interfaz

### 4.1 Barra superior
- Título: "Simulador Elecciones JS 2026"
- Dos pestañas: **Comité Central Nacional** | **Comité Central Regional**

### 4.2 Pestaña CCN

**Bloque 1 — Gestión de Pactos:**
- Lista de pactos definidos por el usuario (nombre editable)
- Botón "+ Agregar Pacto"
- Botón eliminar pacto [x] (deshabilitado si tiene candidatos asignados)

**Bloque 2 — Ingreso de Candidatos:**
- Formulario: Nombre | Pacto (dropdown) | Votos | Sexo (H/M) | [+ Agregar]
- Tabla editable con los candidatos ingresados (con botón eliminar por fila)

**Bloque 3 — Resultados:**
- Botón "Calcular"
- Tabla resumen D'Hondt: Pacto → Votos totales → Cupos obtenidos
- Lista de electos: Nombre | Pacto | Votos | Sexo | Estado (✓ Electo / ★ Paridad / 🎲 Sorteo)
- Indicador de paridad: "X hombres / Y mujeres — ✓ Cumple paridad (mín. 5 c/u)" o "⚠ Corregido por paridad"
- Si paridad no es alcanzable, mostrar aviso inline: "No es posible alcanzar la paridad con los candidatos ingresados."

### 4.3 Pestaña CCR

**Selector de región:** dropdown con las 16 regiones habilitadas (cada una con su número de cupos indicado, ej. "Metropolitana de Santiago — 7 cupos")

Cada región tiene los mismos bloques 1, 2 y 3 que la pestaña CCN, pero con datos independientes (pactos propios, candidatos propios, resultados propios). Al cambiar de región, los datos de la región anterior se conservan en memoria durante la sesión.

**Botón adicional:** "Ver resumen nacional CCR" → tabla con todas las regiones que tengan candidatos ingresados, mostrando electos y estado de paridad por región.

---

## 5. Datos Hardcodeados (Cuadro I, art. 34)

Padrón = total militantes (afiliados + adherentes). La región Exterior tiene 0 cupos CCR y no aparece en el selector.

| Región | Cupos CCR | Padrón (total) |
|---|---|---|
| De Arica | 1 | 138 |
| De Tarapacá | 1 | 144 |
| De Antofagasta | 2 | 233 |
| De Atacama | 2 | 313 |
| De Coquimbo | 1 | 128 |
| De Valparaíso | 2 | 293 |
| Metropolitana de Santiago | 7 | 2212 |
| Del Libertador B. O'Higgins | 2 | 163 |
| Del Maule | 2 | 179 |
| De Ñuble | 1 | 154 |
| Del BioBío | 2 | 266 |
| De La Araucanía | 2 | 196 |
| De Los Ríos | 1 | 118 |
| De Los Lagos | 2 | 278 |
| De Aysén | 1 | 29 |
| De Magallanes | 1 | 62 |

**Suma total cupos CCR: 30** ✓

---

## 6. Lógica de Cómputo

### 6.0 Lista única (art. 74)

Si solo hay un pacto inscrito (sin competencia):
- Se omite el cálculo D'Hondt; todos los cupos van al único pacto
- Los candidatos se ordenan por votos individuales descendente; los primeros N son electos
- La corrección de paridad se aplica normalmente
- Se muestra aviso: "Lista única — se aplica conteo directo (art. 74)"
- No se muestra la matriz de cocientes

### 6.1 Algoritmo D'Hondt (art. 75)

Aplica para CCN (N=11) y CCR por región (N=cupos_región):

1. Calcular **votos totales por pacto** = suma de votos individuales de todos sus candidatos
2. Para cada pacto p, generar cocientes: `votos[p] / k` para k = 1, 2, ..., N
3. Reunir todos los cocientes en un solo listado y ordenar de mayor a menor
4. La **cifra repartidora** = valor en la posición N (índice N−1) del listado ordenado
5. **Cupos iniciales por pacto** = `Math.floor(votos[p] / cifra_repartidora)` para cada pacto p
6. **Reconciliación de cupos:** Si `suma(cupos) < N` (puede ocurrir por empate en el límite):
   - Identificar los pactos cuyo siguiente cociente no asignado (`votos[p] / (cupos[p]+1)`) es igual a la cifra repartidora
   - Asignar los cupos faltantes uno a uno al pacto empatado con mayor `votos[p]` total
   - Si persiste el empate de votos totales: mostrar un banner inline "⚠ Empate en cifra repartidora — se requiere sorteo para el cupo N°X" y asignar aleatoriamente para efectos de la simulación, marcando el cupo con badge "sorteo"
7. Dentro de cada pacto, se eligen los candidatos con mayor cantidad de votos individuales (top N según cupos asignados al pacto); en caso de empate de votos individuales dentro del pacto: mostrar banner inline "⚠ Empate en votos individuales — se requiere sorteo para el candidato N°X", asignar aleatoriamente para efectos de la simulación y marcar al candidato con badge "🎲 Sorteo"

### 6.2 Corrección de Paridad — CCN (art. 76–77a)

**Mínimo requerido:** `Math.ceil(11 × 0.4) = 5` integrantes de cada género entre los 11 electos.

Si no se cumple tras aplicar D'Hondt:

1. Para cada lista calcular su **déficit** = cuántos electos del género subrepresentado faltan para cubrir el mínimo de su lista
2. Ordenar listas de mayor a menor déficit
3. Para la lista con mayor déficit:
   - Buscar el electo del género sobrerepresentado con **menor votación individual** dentro de esa lista
   - Buscar el no electo del género subrepresentado con **mayor votación individual** dentro de esa misma lista
   - Si se encuentran ambos: ejecutar el reemplazo y marcar al candidato entrante con badge "★ Paridad"
   - Si no hay no electo del género subrepresentado en esa lista: pasar a la siguiente lista por orden de déficit
4. **Recalcular los déficits de todas las listas** tras cada reemplazo y volver al paso 2 hasta que se cumpla el mínimo global de 5 por género
5. Si ninguna lista puede proveer el reemplazo necesario: mostrar aviso inline "⚠ No es posible alcanzar la paridad con los candidatos ingresados"

### 6.3 Corrección de Paridad — CCR (art. 77b)

**Mínimo requerido por región:** `Math.ceil(cupos_región × 0.4)` integrantes de cada género entre los electos de esa región.

Si no se cumple:

1. Calcular **coeficiente electoral** de cada candidato = `votos_candidato / padrón_región` (padrón = valor hardcodeado de la tabla en sección 5)
2. Ordenar los electos de mayor a menor coeficiente
3. Identificar el género subrepresentado
4. Buscar en los electos el candidato del género sobrerepresentado con **menor coeficiente**
5. Buscar en los no electos de la misma lista el candidato del género subrepresentado con **mayor coeficiente**
6. Si se encuentran ambos: ejecutar el reemplazo y marcar al candidato entrante con badge "★ Paridad"
7. Si no hay candidato disponible en esa lista: pasar a la siguiente lista con sobrerepresentación del mismo género
8. Repetir desde el paso 3 (re-identificar el género subrepresentado y re-calcular coeficientes si corresponde) hasta cumplir el mínimo o hasta que ninguna lista pueda proveer reemplazo: mostrar aviso "⚠ No es posible alcanzar la paridad con los candidatos ingresados"

---

## 7. Validaciones

- No se puede calcular sin al menos un pacto y un candidato
- El campo Votos debe ser número entero ≥ 0
- El campo Nombre no puede estar vacío
- Pacto debe estar seleccionado
- Si lista única: mostrar aviso de conteo directo (art. 74) y proceder normalmente
- Si un pacto obtiene más cupos que candidatos tiene inscritos: asignar solo los candidatos disponibles y mostrar advertencia

---

## 8. Visualización de Resultados

### Tabla D'Hondt (detalle)
Matriz completa de cocientes: filas = pactos, columnas = divisores 1..N, con resaltado de celdas ganadoras. Oculta en modo lista única.

### Lista de Electos

| # | Nombre | Pacto | Votos | Sexo | Coef. electoral | Estado |
|---|---|---|---|---|---|---|
| 1 | Ana López | Tercerismo | 150 | M | 0.068 | ✓ Electo |
| 2 | Juan Pérez | Renova | 140 | H | 0.063 | ✓ Electo |
| N | María Soto | NI | 90 | M | 0.041 | ★ Paridad |

- La columna **Coef. electoral** solo se muestra en CCR (oculta en CCN)
- El estado puede ser: `✓ Electo` | `★ Paridad` | `🎲 Sorteo`

### Indicador de paridad (igual en CCN y CCR)
```
Hombres: 6  Mujeres: 5  → ✓ Cumple paridad (mín. 5 c/u)
```

---

## 9. Gestión de Estado en Sesión

- Los datos se conservan en variables JS en memoria durante toda la sesión (no persisten al refrescar)
- Al cambiar de pestaña (CCN ↔ CCR), los datos de ambas se conservan
- Al cambiar de región dentro de CCR, los datos de la región anterior se conservan
- El estado de resultados calculados se resetea si el usuario modifica candidatos o pactos después de calcular

---

## 10. Decisiones de Diseño

- **Sin backend:** toda la lógica corre en el navegador (JS puro)
- **Sin persistencia entre sesiones:** los datos se pierden al refrescar; es un simulador de escenarios, no un sistema de registro
- **Pactos independientes por contexto:** los pactos del CCN no se comparten con los del CCR ni entre regiones, reflejando que las alianzas pueden diferir por territorio
- **Padrón hardcodeado (afiliados + adherentes):** se usan los valores oficiales del Cuadro I del art. 34; no son editables por el usuario
- **Región Exterior excluida:** 0 cupos CCR según Cuadro I
- **Paridad con `Math.ceil`:** el umbral del 40% se interpreta como "al menos 40%", lo que requiere redondeo hacia arriba (`ceil`), no hacia abajo
