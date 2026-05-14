import { DataTypes } from 'sequelize';
import sequelize from '../config/database';

const MonthlyOrder = sequelize.define('MonthlyOrder', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  folio: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    comment: 'Folio autogenerado'
  },
  tipo: {
    type: DataTypes.ENUM('aceites', 'papeleria', 'limpieza'),
    allowNull: false,
    comment: 'Tipo de pedido'
  },
  estacion: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: 'Estación solicitante'
  },
  fecha: {
    type: DataTypes.DATEONLY,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  items: {
    type: DataTypes.JSON,
    allowNull: false,
    defaultValue: [],
    comment: 'Array de items con descripción, consumibles, intercambiables, existencias, unidad, cantidad'
  },
  estado: {
    type: DataTypes.ENUM('borrador', 'enviado', 'completado'),
    defaultValue: 'borrador'
  },
  notas: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  confirmadoCompras: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  confirmadoEstacion: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  createdBy: {
    type: DataTypes.INTEGER,
    allowNull: false
  }
}, {
  timestamps: true,
  tableName: 'monthly_orders'
});

export default MonthlyOrder;
