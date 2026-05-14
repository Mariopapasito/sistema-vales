import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/database';

class Order extends Model {
  public id!: number;
  public folio!: string;
  public usuarioId!: number;
  public tipo!: 'sistemas' | 'compras';
  public prioridad!: 'Alta' | 'Baja' | 'Paro' | 'Correctivo';
  public localizacion?: string;
  public descripcion!: string;
  public observaciones?: string;
  public estado!: 'Sin iniciar' | 'En proceso' | 'Completada';
  public imagenes?: string;
  public historialCambios?: any;
  public confirmadoEstacion!: boolean;
  public confirmadoProveedor!: boolean;
  public workReport?: any;
  public firma?: string;        // legacy (kept for backward compat)
  public firma_estacion?: string; // firma de quien crea/confirma (estacion)
  public firma_sistemas?: string; // firma de sistemas al marcar completada
}

Order.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    folio: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      defaultValue: () => 'ORD-' + Date.now().toString().slice(-8),
    },
    usuarioId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    tipo: {
      type: DataTypes.ENUM('sistemas', 'compras'),
      allowNull: false,
      defaultValue: 'sistemas',
    },
    prioridad: {
      type: DataTypes.ENUM('Alta', 'Baja', 'Paro', 'Correctivo'),
      allowNull: false,
    },
    localizacion: {
      type: DataTypes.STRING,
    },
    descripcion: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    observaciones: {
      type: DataTypes.TEXT,
    },
    estado: {
      type: DataTypes.ENUM('Sin iniciar', 'En proceso', 'Completada'),
      defaultValue: 'Sin iniciar',
    },
    imagenes: {
      type: DataTypes.JSON,
    },
    historialCambios: {
      type: DataTypes.JSON,
      defaultValue: [],
    },
    confirmadoEstacion: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    confirmadoProveedor: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    firma: {
      type: DataTypes.TEXT('long'),
      allowNull: true,
    },
    firma_estacion: {
      type: DataTypes.TEXT('long'),
      allowNull: true,
    },
    firma_sistemas: {
      type: DataTypes.TEXT('long'),
      allowNull: true,
    },
  },
  {
    sequelize,
    modelName: 'Order',
    tableName: 'orders',
    timestamps: true,
  }
);

export default Order;
