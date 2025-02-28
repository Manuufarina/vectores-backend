const express = require('express');
const Vecino = require('../models/Vecino');

const router = express.Router();

// Obtener todos los vecinos
router.get('/', async (req, res) => {
  try {
    const vecinos = await Vecino.find();
    res.json(vecinos);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Crear un nuevo vecino
router.post('/', async (req, res) => {
  const vecino = new Vecino(req.body);
  try {
    const nuevoVecino = await vecino.save();
    res.status(201).json(nuevoVecino);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Obtener un vecino por ID
router.get('/:id', async (req, res) => {
  try {
    const vecino = await Vecino.findById(req.params.id);
    if (!vecino) return res.status(404).json({ message: 'Vecino no encontrado' });
    res.json(vecino);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Actualizar un vecino
router.put('/:id', async (req, res) => {
  try {
    const vecino = await Vecino.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!vecino) return res.status(404).json({ message: 'Vecino no encontrado' });
    res.json(vecino);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Eliminar un vecino
router.delete('/:id', async (req, res) => {
  try {
    const vecino = await Vecino.findByIdAndDelete(req.params.id);
    if (!vecino) return res.status(404).json({ message: 'Vecino no encontrado' });
    res.json({ message: 'Vecino eliminado' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;