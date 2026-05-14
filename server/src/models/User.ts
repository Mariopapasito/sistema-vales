import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/database';

class User extends Model {
  public id!: number;
  public nombre!: string;
  public email!: string;
  public password!: string;
  public rol!: 'jefe' | 'sistemas' | 'estacion' | 'compras';
  public estacion!: string;
  public foto?: string;
  public activo!: boolean;
}

User.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    nombre: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    password: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    rol: {
      type: DataTypes.ENUM('jefe', 'sistemas', 'estacion', 'compras'),
      defaultValue: 'estacion',
    },
    estacion: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    foto: {
      type: DataTypes.TEXT('medium'),
      allowNull: true,
    },
    activo: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
  },
  {
    sequelize,
    modelName: 'User',
    tableName: 'users',
    timestamps: true,
  }
);

export default User;
