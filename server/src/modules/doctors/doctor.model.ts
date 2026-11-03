import { InferSchemaType, model, Schema } from 'mongoose';
import { SPECIALIZATIONS } from '../../shared/constants';
import { normalizeName } from '../../shared/search';

const doctorSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    // Normalized search key (lowercase). Kept in sync by the pre-validate hook below.
    nameLower: { type: String, required: true },
    specialization: { type: String, enum: SPECIALIZATIONS, required: true },
    hospital: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true, lowercase: true },
    isDeleted: { type: Boolean, default: false },
    deletedAt: { type: Date },
  },
  { timestamps: true },
);

doctorSchema.pre('validate', function (next) {
  if (this.isModified('name')) this.nameLower = normalizeName(this.name);
  next();
});

// Email is unique among ACTIVE doctors only, so it can be reused after a doctor is deleted.
// A boolean equality filter is used because partial indexes cannot reliably match null/$exists.
doctorSchema.index({ email: 1 }, { unique: true, partialFilterExpression: { isDeleted: false } });
doctorSchema.index({ isDeleted: 1, nameLower: 1 });
doctorSchema.index({ isDeleted: 1, specialization: 1, createdAt: -1 });
// Dashboard: doctors added per period.
doctorSchema.index({ isDeleted: 1, createdAt: -1 });

export type DoctorDoc = InferSchemaType<typeof doctorSchema>;
export const Doctor = model('Doctor', doctorSchema);
