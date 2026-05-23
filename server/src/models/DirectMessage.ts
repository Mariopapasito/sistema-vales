import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/database';
import User from './User';

class DirectMessage extends Model {
  public id!: number;
  public fromUserId!: number;
  public toUserId!: number;
  public texto!: string;
  public leido!: boolean;
  public readonly createdAt!: Date;
}

DirectMessage.init(
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    fromUserId: { type: DataTypes.INTEGER, allowNull: false },
    toUserId: { type: DataTypes.INTEGER, allowNull: false },
    texto: { type: DataTypes.TEXT, allowNull: false },
    leido: { type: DataTypes.BOOLEAN, defaultValue: false },
  },
  {
    sequelize,
    modelName: 'DirectMessage',
    tableName: 'direct_messages',
    timestamps: true,
    updatedAt: false,
  }
);

DirectMessage.belongsTo(User, { as: 'from', foreignKey: 'fromUserId' });
DirectMessage.belongsTo(User, { as: 'to', foreignKey: 'toUserId' });

export default DirectMessage;
