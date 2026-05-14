import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/database';

class Material extends Model {
  public id!: number;
  public name!: string;
  public sku?: string;
  public category!: string;
  public quantity!: number;
  public unit!: string;
  public cost!: number;
  public provider?: string;
  public minStock?: number;
  public description?: string;
  public activo!: boolean;
}

Material.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    sku: {
      type: DataTypes.STRING,
      unique: true,
      allowNull: true,
    },
    category: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: 'Construcción, Herramientas, Consumibles, etc.',
    },
    quantity: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    unit: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: 'piezas, metros, litros, kg, etc.',
    },
    cost: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },
    provider: {
      type: DataTypes.STRING,
    },
    minStock: {
      type: DataTypes.INTEGER,
      defaultValue: 5,
      comment: 'Cantidad mínima antes de alerta',
    },
    description: {
      type: DataTypes.TEXT,
    },
    activo: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
  },
  {
    sequelize,
    modelName: 'Material',
    tableName: 'materials',
    timestamps: true,
  }
);

export default Material;
