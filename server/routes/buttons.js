const express = require('express');
const router = express.Router();
const Button = require('../models/Button');

router.get('/', async (req, res) => {
  try {
    const buttons = await Button.findAll(true);
    res.json({ success: true, data: buttons });
  } catch (error) {
    console.error('Error fetching buttons:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch buttons' });
  }
});

router.get('/all', async (req, res) => {
  try {
    const buttons = await Button.findAll(false);
    res.json({ success: true, data: buttons });
  } catch (error) {
    console.error('Error fetching all buttons:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch buttons' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const button = await Button.findById(req.params.id);
    if (!button) {
      return res.status(404).json({ success: false, error: 'Button not found' });
    }
    res.json({ success: true, data: button });
  } catch (error) {
    console.error('Error fetching button:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch button' });
  }
});

router.post('/', async (req, res) => {
  try {
    const button = await Button.create(req.body);
    res.status(201).json({ success: true, data: button });
  } catch (error) {
    console.error('Error creating button:', error);
    res.status(500).json({ success: false, error: 'Failed to create button' });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const button = await Button.findById(req.params.id);
    if (!button) {
      return res.status(404).json({ success: false, error: 'Button not found' });
    }
    
    const updatedButton = await Button.update(req.params.id, req.body);
    res.json({ success: true, data: updatedButton });
  } catch (error) {
    console.error('Error updating button:', error);
    res.status(500).json({ success: false, error: 'Failed to update button' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const button = await Button.findById(req.params.id);
    if (!button) {
      return res.status(404).json({ success: false, error: 'Button not found' });
    }
    
    await Button.delete(req.params.id);
    res.json({ success: true, message: 'Button deleted successfully' });
  } catch (error) {
    console.error('Error deleting button:', error);
    res.status(500).json({ success: false, error: 'Failed to delete button' });
  }
});

router.post('/reorder', async (req, res) => {
  try {
    const { buttons } = req.body;
    await Button.updateOrder(buttons);
    res.json({ success: true, message: 'Buttons reordered successfully' });
  } catch (error) {
    console.error('Error reordering buttons:', error);
    res.status(500).json({ success: false, error: 'Failed to reorder buttons' });
  }
});

module.exports = router;
