const mongoose = require('mongoose');

const vecinoSchema = new mongoose.Schema({
  nombre: { type: String, required: true },
  direccion: { type: String, required: true },
  barrio: { type: String, required: true },
  telefono: { type: String, required: true },
  m2: { type: Number, required: true },
  esDelegacion: { type: Boolean, default: false },
  delegacion: { type: String, default: '' },
  abona: { type: Boolean, default: false },
  numeroRecibo: { type: String, default: '' },
  motivoNoAbona: { type: String, default: '' },
});

module.exports = mongoose.model('Vecino', vecinoSchema);