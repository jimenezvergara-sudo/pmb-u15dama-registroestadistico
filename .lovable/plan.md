

## Ampliar el editor de partido: campeonato + agregar puntos/acciones

Voy a ampliar `GameEventEditor.tsx` para que, además de editar/eliminar registros existentes, permita **asignar el partido a un campeonato** y **agregar nuevos eventos** (tiros propios, puntos del rival y acciones) directamente desde el diálogo de edición que se abre desde el Dashboard y desde "Editar Partido" en NewGame.

### Cambios en la interfaz del diálogo

Estructura nueva del modal (vertical, mobile-first):

```text
┌────────────────────────────────────────────┐
│ Editar Registros del Partido               │
│ vs Rival — fecha                           │
├────────────────────────────────────────────┤
│ 🏆 Campeonato: [ Selector ▾ ]  (Sin asignar│
│                                  / lista)  │
├────────────────────────────────────────────┤
│ ➕ Agregar evento                          │
│  [Tiro] [Rival] [Acción]   ← sub-tabs      │
│  -- según tipo --                          │
│  Tiro:    Jugadora ▾ | Cuarto ▾ | 1/2/3 PT │
│           [✅ Anotado] [❌ Fallado]         │
│  Rival:   Cuarto ▾ | 1 PT | 2 PT | 3 PT    │
│  Acción:  Jugadora ▾ | Cuarto ▾ | Tipo ▾   │
│           [Agregar]                        │
├────────────────────────────────────────────┤
│ Tabs: Todo | Tiros | Rival | Acciones      │
│ Tabla de registros (igual que hoy)         │
├────────────────────────────────────────────┤
│ [Cancelar]              [Guardar cambios]  │
└────────────────────────────────────────────┘
```

### Detalles funcionales

**1. Asignar campeonato**
- Selector con `tournaments` desde `useApp()`. Opciones: "Sin campeonato" + lista existente.
- Modifica `editedGame.tournamentId` en estado local; se persiste al pulsar "Guardar cambios" (la función `updateGame` ya guarda este campo).

**2. Agregar tiro propio**
- Selector de jugadora (del `roster` del partido), selector de cuarto, botones de puntos (1, 2, 3) y resultado (Anotado/Fallado).
- Genera un `ShotEvent` con `id` aleatorio, `timestamp = Date.now()`, `x = 50`, `y = 50` (centro de la cancha, ya que se agrega manualmente sin diagrama).
- Se añade a `editedGame.shots`.

**3. Agregar puntos del rival**
- Selector de cuarto + 3 botones (1 PT / 2 PT / 3 PT) que insertan inmediatamente un `OpponentScore`.

**4. Agregar acción**
- Selector de jugadora + cuarto + tipo (Reb. Ofensivo, Reb. Defensivo, Asistencia, Robo, Pérdida, Falta).
- Inserta un `GameAction` en `editedGame.actions`.

**5. Guardado**
- `handleSave` ya pasa `editedGame` completo a `onSave → updateGame`, que sincroniza con Supabase (`club_games`) incluyendo `tournament_id`, `shots`, `opponent_scores` y `actions`. No se requieren cambios de BD ni en `AppContext`.

**6. Sub-tabs colapsables**
- El bloque "Agregar evento" se muestra como sección colapsable (cerrada por defecto) para no saturar el modal en pantallas pequeñas.

### Archivos a modificar

- `src/components/GameEventEditor.tsx` — añadir selector de campeonato, sección "Agregar evento" con sub-tabs (tiro / rival / acción), y handlers `addShot`, `addOpponent`, `addAction`. Importar `useApp` para leer `tournaments`.

### Sin cambios necesarios

- `AppContext.updateGame` ya persiste `tournament_id`, `shots`, `opponent_scores` y `actions`.
- Schema de `club_games` ya soporta todos los campos.
- Sin migración de base de datos.

### Validaciones

- No permitir agregar tiro/acción si no hay jugadora seleccionada (botón deshabilitado).
- Coordenadas de tiros agregados manualmente: `x = 50, y = 50` (centro). Se mostrarán en el diagrama de cancha como punto central; aceptable porque son correcciones manuales.
- Tras agregar un evento, el formulario se resetea y el evento aparece en la tabla de abajo inmediatamente.

