import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/database';

class WorkReport extends Model {
  public id!: number;
  public number!: string;
  public orderId!: number;
  public createdById!: number;
  public assignedToId?: number;
  public station?: string;
  public faultCode?: string;
  public equipmentNumber?: string;
  public responsible?: string;
  public serialNumber?: string;
  public faultDescription?: string;
  public actionTaken?: string;
  public preventionTaken?: string;
  public attendedBy?: string;
  public responseDate?: Date;
  public completed!: boolean;
  public technicianSignature?: string;
  public requestorSignature?: string;
  public rating?: 'MUY_MALO' | 'MALO' | 'BUENO' | 'MUY_BUENO' | 'EXCELENTE';
  public notes?: string;
}

WorkReport.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    number: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      defaultValue: () => 'OT-' + Date.now().toString().slice(-6),
    },
    orderId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'orders',
        key: 'id',
      },
    },
    createdById: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id',
      },
    },
    assignedToId: {
      type: DataTypes.INTEGER,
      references: {
        model: 'users',
        key: 'id',
      },
    },
    station: {
      type: DataTypes.STRING,
      comment: 'Gasolinera, Oficina, Bodega, Otros, Plaza Alessia, Almacén Camino Real',
    },
    faultCode: {
      type: DataTypes.STRING,
    },
    equipmentNumber: {
      type: DataTypes.STRING,
    },
    responsible: {
      type: DataTypes.STRING,
    },
    serialNumber: {
      type: DataTypes.STRING,
    },
    faultDescription: {
      type: DataTypes.TEXT,
    },
    actionTaken: {
      type: DataTypes.TEXT,
    },
    preventionTaken: {
      type: DataTypes.TEXT,
    },
    attendedBy: {
      type: DataTypes.STRING,
    },
    responseDate: {
      type: DataTypes.DATE,
    },
    completed: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    technicianSignature: {
      type: DataTypes.TEXT,
      comment: 'URL o base64 de firma digital',
    },
    requestorSignature: {
      type: DataTypes.TEXT,
      comment: 'URL o base64 de firma digital',
    },
    rating: {
      type: DataTypes.ENUM('MUY_MALO', 'MALO', 'BUENO', 'MUY_BUENO', 'EXCELENTE'),
    },
    notes: {
      type: DataTypes.TEXT,
    },
  },
  {
    sequelize,
    modelName: 'WorkReport',
    tableName: 'work_reports',
    timestamps: true,
  }
);

export default WorkReport;
