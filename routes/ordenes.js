const express = require('express');
const OrdenTrabajo = require('../models/OrdenTrabajo');

const router = express.Router();

// Obtener todas las órdenes de trabajo
router.get('/', async (req, res) => {
  try {
    const ordenes = await OrdenTrabajo.find().populate('vecino');
    res.json(ordenes);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Crear una nueva orden de trabajo
router.post('/', async (req, res) => {
  const orden = new OrdenTrabajo(req.body);
  try {
    const nuevaOrden = await orden.save();
    res.status(201).json(nuevaOrden);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Obtener una orden de trabajo por ID
router.get('/:id', async (req, res) => {
  try {
    const orden = await OrdenTrabajo.findById(req.params.id).populate('vecino');
    if (!orden) return res.status(404).json({ message: 'Orden no encontrada' });
    res.json(orden);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Actualizar una orden de trabajo
router.put('/:id', async (req, res) => {
  try {
    const orden = await OrdenTrabajo.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!orden) return res.status(404).json({ message: 'Orden no encontrada' });
    res.json(orden);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Eliminar una orden de trabajo
router.delete('/:id', async (req, res) => {
  try {
    const orden = await OrdenTrabajo.findByIdAndDelete(req.params.id);
    if (!orden) return res.status(404).json({ message: 'Orden no encontrada' });
    res.json({ message: 'Orden eliminada' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Agregar una visita a una orden de trabajo
router.post('/:id/visitas', async (req, res) => {
  try {
    const orden = await OrdenTrabajo.findById(req.params.id);
    if (!orden) return res.status(404).json({ message: 'Orden no encontrada' });
    orden.visitas.push(req.body);
    await orden.save();
    res.status(201).json(orden);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Marcar una orden como completada
router.patch('/:id/completar', async (req, res) => {
  try {
    const orden = await OrdenTrabajo.findByIdAndUpdate(req.params.id, { estado: 'completada' }, { new: true });
    if (!orden) return res.status(404).json({ message: 'Orden no encontrada' });
    res.json(orden);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

module.exports = router;