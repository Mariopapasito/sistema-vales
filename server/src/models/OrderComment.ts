import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/database';

class OrderComment extends Model {
  public id!: number;
  public orderId!: number;
  public usuarioId!: number;
  public texto!: string;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

OrderComment.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    orderId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'orders', key: 'id' },
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
    modelName: 'OrderComment',
    tableName: 'order_comments',
  }
);

export default OrderComment;
