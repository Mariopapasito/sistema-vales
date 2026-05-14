import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/database';

interface ImageData {
  url: string;
  descripcion: string;
}

class ReportPhoto extends Model {
  public id!: number;
  public titulo!: string;
  public descripcion?: string;
  public imagenes!: ImageData[];
  public userId!: number;
  public createdAt!: Date;
  public updatedAt!: Date;
}

ReportPhoto.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    titulo: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    descripcion: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    imagenes: {
      type: DataTypes.JSON,
      allowNull: false,
      defaultValue: [],
      comment: 'Array de objetos con { url: string, descripcion: string }',
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    createdAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
    updatedAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    sequelize,
    tableName: 'report_photos',
    timestamps: true,
  }
);

export default ReportPhoto;
