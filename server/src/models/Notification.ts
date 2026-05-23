import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/database';
import User from './User';

interface NotificationAttributes {
  id?: number;
  usuarioId: number;
  tipo: 'NEW_ORDER' | 'ORDER_STATUS_CHANGED' | 'CALENDAR_EVENT' | 'SYSTEM' | 'MENTION' | 'COMMENT';
  titulo: string;
  mensaje: string;
  datos?: any;
  leida: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

class Notification extends Model<NotificationAttributes> implements NotificationAttributes {
  declare id: number;
  declare usuarioId: number;
  declare tipo: 'NEW_ORDER' | 'ORDER_STATUS_CHANGED' | 'CALENDAR_EVENT' | 'SYSTEM' | 'MENTION' | 'COMMENT';
  declare titulo: string;
  declare mensaje: string;
  declare datos: any;
  declare leida: boolean;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;
}

Notification.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true
    },
    usuarioId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: User,
        key: 'id'
      }
    },
    tipo: {
      type: DataTypes.ENUM('NEW_ORDER', 'ORDER_STATUS_CHANGED', 'CALENDAR_EVENT', 'SYSTEM', 'MENTION', 'COMMENT'),
      allowNull: false
    },
    titulo: {
      type: DataTypes.STRING,
      allowNull: false
    },
    mensaje: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    datos: {
      type: DataTypes.JSON,
      allowNull: true
    },
    leida: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    }
  },
  {
    sequelize,
    modelName: 'Notification',
    tableName: 'notifications',
    timestamps: true
  }
);

export default Notification;
