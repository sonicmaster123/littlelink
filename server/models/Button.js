const pool = require('../config/database');

class Button {
  static async findAll(activeOnly = false) {
    let query = 'SELECT * FROM buttons ORDER BY sort_order ASC';
    let params = [];
    
    if (activeOnly) {
      query = 'SELECT * FROM buttons WHERE is_active = TRUE ORDER BY sort_order ASC';
    }
    
    const [rows] = await pool.execute(query, params);
    return rows;
  }

  static async findById(id) {
    const [rows] = await pool.execute('SELECT * FROM buttons WHERE id = ?', [id]);
    return rows[0];
  }

  static async create(buttonData) {
    const { name, css_class, icon_path, icon_alt, display_text, url, sort_order, is_active } = buttonData;
    
    const [result] = await pool.execute(
      `INSERT INTO buttons (name, css_class, icon_path, icon_alt, display_text, url, sort_order, is_active) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [name, css_class, icon_path, icon_alt || '', display_text, url || '#', sort_order || 0, is_active !== false]
    );
    
    return this.findById(result.insertId);
  }

  static async update(id, buttonData) {
    const { name, css_class, icon_path, icon_alt, display_text, url, sort_order, is_active } = buttonData;
    
    await pool.execute(
      `UPDATE buttons 
       SET name = ?, css_class = ?, icon_path = ?, icon_alt = ?, display_text = ?, url = ?, sort_order = ?, is_active = ?
       WHERE id = ?`,
      [name, css_class, icon_path, icon_alt || '', display_text, url || '#', sort_order || 0, is_active !== false, id]
    );
    
    return this.findById(id);
  }

  static async delete(id) {
    const [result] = await pool.execute('DELETE FROM buttons WHERE id = ?', [id]);
    return result.affectedRows > 0;
  }

  static async updateOrder(buttons) {
    for (const button of buttons) {
      await pool.execute('UPDATE buttons SET sort_order = ? WHERE id = ?', [button.sort_order, button.id]);
    }
    return true;
  }
}

module.exports = Button;
