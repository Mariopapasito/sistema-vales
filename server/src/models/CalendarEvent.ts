import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/database';

class CalendarEvent extends Model {
  public id!: number;
  public titulo?: string;
  public descripcion?: string;
  public fechaInicio!: Date;
  public duracion?: number;
  public color?: string;
  public responsable?: string;
  public createdBy!: number;
  public categoria?: string;
  public completed!: boolean;
}

CalendarEvent.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    titulo: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    descripcion: {
      type: DataTypes.TEXT,
    },
    fechaInicio: {
      type: DataTypes.DATE,
      allowNull: false,
      field: 'fecha_inicio',
    },
    duracion: {
      type: DataTypes.INTEGER,
      defaultValue: 60,
    },
    color: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    categoria: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    responsable: {
      type: DataTypes.STRING,
    },
    createdBy: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    completed: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
  },
  {
    sequelize,
    modelName: 'CalendarEvent',
    tableName: 'calendar_events',
    timestamps: true,
  }
);

export default CalendarEvent;
