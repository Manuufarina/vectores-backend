const mongoose = require('mongoose');

const visitaSchema = new mongoose.Schema({
  fecha: { type: Date, required: true },
  observaciones: { type: String, required: true },
  cantidadProducto: { type: Number, required: true },
  tipoProducto: { type: String, required: true },
  tecnicos: [{ type: String, required: true }],
});

const ordenTrabajoSchema = new mongoose.Schema({
  vecino: { type: mongoose.Schema.Types.ObjectId, ref: 'Vecino', required: true },
  tipoServicio: { type: String, required: true },
  estado: { type: String, default: 'pendiente' }, // pendiente, en curso, completada
  visitas: [visitaSchema],
  numeroOrden: { type: Number, unique: true },
});

ordenTrabajoSchema.pre('save', async function(next) {
  if (!this.numeroOrden) {
    const lastOrder = await this.constructor.findOne().sort({ numeroOrden: -1 });
    this.numeroOrden = lastOrder ? lastOrder.numeroOrden + 1 : 1;
  }
  next();
});

module.exports = mongoose.model('OrdenTrabajo', ordenTrabajoSchema);