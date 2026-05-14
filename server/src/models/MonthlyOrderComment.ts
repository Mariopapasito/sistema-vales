import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/database';

class MonthlyOrderComment extends Model {
  public id!: number;
  public monthlyOrderId!: number;
  public usuarioId!: number;
  public texto!: string;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

MonthlyOrderComment.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    monthlyOrderId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'monthly_orders', key: 'id' },
      onDelete: 'CASCADE',
    },
    usuarioId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'users', key: 'id' },
      onDelete: 'CASCADE',
    },
    texto: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
  },
  {
    sequelize,
    modelName: 'MonthlyOrderComment',
    tableName: 'monthly_order_comments',
  }
);

export default MonthlyOrderComment;
