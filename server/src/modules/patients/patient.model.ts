import { InferSchemaType, model, Schema } from 'mongoose';
import { CONDITIONS, GENDERS } from '../../shared/constants';
import { normalizeName } from '../../shared/search';

const patientSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    nameLower: { type: String, required: true },
    age: { type: Number, required: true, min: 0, max: 120 },
    gender: { type: String, enum: GENDERS, required: true },
    phone: { type: String, required: true, trim: true },
    condition: { type: String, enum: CONDITIONS, required: true },
    doctorId: { type: Schema.Types.ObjectId, ref: 'Doctor', required: true },
    isDeleted: { type: Boolean, default: false },
    deletedAt: { type: Date },
  },
  { timestamps: true },
);

patientSchema.pre('validate', function (next) {
  if (this.isModified('name')) this.nameLower = normalizeName(this.name);
  next();
});

patientSchema.index({ isDeleted: 1, doctorId: 1, createdAt: -1 });
patientSchema.index({ isDeleted: 1, nameLower: 1 });
patientSchema.index({ isDeleted: 1, condition: 1, createdAt: -1 });
patientSchema.index({ isDeleted: 1, createdAt: -1 });

export type PatientDoc = InferSchemaType<typeof patientSchema>;
export const Patient = model('Patient', patientSchema);
