const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const { google } = require('googleapis');
const vecinosRouter = require('./routes/vecinos');
const ordenesRouter = require('./routes/ordenes');

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// ============================================
// CONFIGURACIÓN DE GOOGLE CALENDAR
// ============================================

const GOOGLE_CALENDAR_ID = process.env.GOOGLE_CALENDAR_ID || 'primary';
let calendar = null;
let isCalendarConfigured = false;

function initializeGoogleCalendar() {
  try {
    if (process.env.GOOGLE_SERVICE_ACCOUNT_KEY) {
      const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY);
      const auth = new google.auth.GoogleAuth({
        credentials,
        scopes: ['https://www.googleapis.com/auth/calendar'],
      });
      calendar = google.calendar({ version: 'v3', auth });
      console.log('✓ Google Calendar inicializado con Service Account');
      return true;
    }
    console.warn('⚠ Google Calendar NO configurado - falta GOOGLE_SERVICE_ACCOUNT_KEY');
    return false;
  } catch (error) {
    console.error('Error al inicializar Google Calendar:', error.message);
    return false;
  }
}

function buildGoogleCalendarEvent(job, client) {
  const { fechaTrabajo, problematica, tecnicos, observaciones, tipo } = job;
  const clientName = client ? `${client.nombre || ''} ${client.apellido || ''}`.trim() : 'Cliente';
  const direccion = client?.direccion
    ? `${client.direccion.calle || ''} ${client.direccion.altura || ''}, ${client.direccion.localidad || 'San Isidro'}`.trim()
    : 'Sin dirección';

  const tecnicosStr = Array.isArray(tecnicos) && tecnicos.length > 0
    ? tecnicos.join(', ')
    : 'Sin asignar';

  const description = `**Trabajo de Control de Vectores**

**Cliente:** ${clientName}
**Dirección:** ${direccion}
**Teléfono:** ${client?.telefono || 'No especificado'}

**Tipo:** ${tipo || 'No especificado'}
**Problemática:** ${problematica || 'No especificada'}
**Técnicos asignados:** ${tecnicosStr}

**Observaciones:**
${observaciones || 'Sin observaciones'}`;

  const summary = `${problematica || 'Trabajo'} - ${clientName} - ${direccion}`;
  const startDateTime = new Date(fechaTrabajo);
  const endDateTime = new Date(startDateTime.getTime() + 2 * 60 * 60 * 1000);

  const colorMap = {
    'Roedores': '11',
    'Desinfeccion': '9',
    'Desinsectacion': '10',
    'Panal': '5',
    'Inspeccion': '8',
  };

  return {
    summary,
    description,
    location: direccion,
    start: {
      dateTime: startDateTime.toISOString(),
      timeZone: 'America/Argentina/Buenos_Aires',
    },
    end: {
      dateTime: endDateTime.toISOString(),
      timeZone: 'America/Argentina/Buenos_Aires',
    },
    colorId: colorMap[problematica] || '1',
    reminders: {
      useDefault: false,
      overrides: [
        { method: 'email', minutes: 24 * 60 },
        { method: 'popup', minutes: 60 },
      ],
    },
  };
}

isCalendarConfigured = initializeGoogleCalendar();

// ============================================
// CONEXIÓN A MONGODB
// ============================================

mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
  .then(() => console.log('Conectado a MongoDB'))
  .catch(err => console.error('Error al conectar a MongoDB:', err));

// ============================================
// RUTAS EXISTENTES
// ============================================

app.use('/api/vecinos', vecinosRouter);
app.use('/api/ordenes', ordenesRouter);

// ============================================
// ENDPOINTS DE GOOGLE CALENDAR
// ============================================

app.get('/calendar/health', (req, res) => {
  res.json({
    status: 'ok',
    calendarConfigured: isCalendarConfigured,
    timestamp: new Date().toISOString(),
  });
});

app.post('/events', async (req, res) => {
  if (!isCalendarConfigured) {
    return res.status(503).json({ error: 'Google Calendar no está configurado.', eventId: null });
  }

  try {
    const { job, client } = req.body;
    if (!job || !job.fechaTrabajo) {
      return res.status(400).json({ error: 'Datos incompletos. Se requiere job con fechaTrabajo.' });
    }

    const event = buildGoogleCalendarEvent(job, client);
    const response = await calendar.events.insert({
      calendarId: GOOGLE_CALENDAR_ID,
      requestBody: event,
    });

    console.log(`✓ Evento creado: ${response.data.id}`);
    res.json({ eventId: response.data.id, htmlLink: response.data.htmlLink });
  } catch (error) {
    console.error('Error al crear evento:', error.message);
    res.status(500).json({ error: error.message, eventId: null });
  }
});

app.put('/events/:eventId', async (req, res) => {
  if (!isCalendarConfigured) {
    return res.status(503).json({ error: 'Google Calendar no está configurado.' });
  }

  try {
    const { eventId } = req.params;
    const { job, client } = req.body;
    if (!job || !job.fechaTrabajo) {
      return res.status(400).json({ error: 'Datos incompletos.' });
    }

    const event = buildGoogleCalendarEvent(job, client);
    const response = await calendar.events.update({
      calendarId: GOOGLE_CALENDAR_ID,
      eventId: eventId,
      requestBody: event,
    });

    console.log(`✓ Evento actualizado: ${response.data.id}`);
    res.json({ eventId: response.data.id, htmlLink: response.data.htmlLink });
  } catch (error) {
    console.error('Error al actualizar evento:', error.message);
    if (error.code === 404) {
      return res.status(404).json({ error: 'Evento no encontrado' });
    }
    res.status(500).json({ error: error.message });
  }
});

app.delete('/events/:eventId', async (req, res) => {
  if (!isCalendarConfigured) {
    return res.status(503).json({ error: 'Google Calendar no está configurado.', success: false });
  }

  try {
    const { eventId } = req.params;
    await calendar.events.delete({
      calendarId: GOOGLE_CALENDAR_ID,
      eventId: eventId,
    });

    console.log(`✓ Evento eliminado: ${eventId}`);
    res.json({ success: true, eventId: eventId });
  } catch (error) {
    console.error('Error al eliminar evento:', error.message);
    if (error.code === 404) {
      return res.json({ success: true, message: 'Evento ya no existe' });
    }
    res.status(500).json({ error: error.message, success: false });
  }
});

// ============================================
// INICIAR SERVIDOR
// ============================================

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Servidor corriendo en puerto ${PORT}`));
