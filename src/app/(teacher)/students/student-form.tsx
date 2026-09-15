"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { studentSchema, type StudentFormData } from "@/lib/validators/student";
import { storage } from "@/lib/firebase/client";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { FormField } from "@/components/ui/form-field";
import { Badge } from "@/components/ui/badge";
import { compressImage } from "@/lib/utils/image-compression";
import {
  Upload,
  User,
  Phone,
  Layers,
  Users,
  DollarSign,
  Camera,
  AlertCircle,
  Calculator,
} from "lucide-react";

interface StudentFormProps {
  classes: Array<{ id: string; name: string }>;
  groups: Array<{ id: string; name: string; classId: string; price: number }>;
  initialData?: Partial<StudentFormData>;
  isEdit?: boolean;
  onSubmit: (data: StudentFormData) => Promise<void>;
  isSubmitting: boolean;
}

export function StudentForm({
  classes,
  groups,
  initialData,
  isEdit = false,
  onSubmit,
  isSubmitting,
}: StudentFormProps) {
  const [photoPreview, setPhotoPreview] = React.useState<string | null>(
    initialData?.photoUrl || null
  );
  const [isUploadingPhoto, setIsUploadingPhoto] = React.useState(false);
  const [uploadError, setUploadError] = React.useState<string | null>(null);

  const defaultClassId = initialData?.classId || classes[0]?.id || "";
  const filteredGroupsForDefault = groups.filter((g) => g.classId === defaultClassId);
  const defaultGroupId =
    initialData?.groupId || filteredGroupsForDefault[0]?.id || groups[0]?.id || "";

  const defaultGroupObj = groups.find((g) => g.id === defaultGroupId);
  const defaultBasePrice = defaultGroupObj ? defaultGroupObj.price : 0;

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<StudentFormData>({
    resolver: zodResolver(studentSchema),
    defaultValues: {
      name: initialData?.name || "",
      phone: initialData?.phone || "",
      classId: defaultClassId,
      groupId: defaultGroupId,
      parentName: initialData?.parentName || "",
      parentPhone: initialData?.parentPhone || "",
      photoUrl: initialData?.photoUrl || "",
      discount: initialData?.discount || 0,
      groupPrice: initialData?.groupPrice !== undefined ? initialData.groupPrice : defaultBasePrice,
      finalPrice: initialData?.finalPrice !== undefined ? initialData.finalPrice : defaultBasePrice,
      status: initialData?.status || "active",
      blockReason: initialData?.blockReason || "",
    },
  });

  const selectedClassId = watch("classId");
  const selectedGroupId = watch("groupId");
  const discountValue = watch("discount") || 0;
  const currentStatus = watch("status");

  // Filter groups according to selected class
  const availableGroups = React.useMemo(() => {
    if (!selectedClassId) return groups;
    return groups.filter((g) => g.classId === selectedClassId);
  }, [groups, selectedClassId]);

  // When class changes, adjust group selection and update groupPrice
  React.useEffect(() => {
    if (availableGroups.length > 0) {
      const isCurrentGroupInClass = availableGroups.some((g) => g.id === selectedGroupId);
      if (!isCurrentGroupInClass) {
        const firstGroup = availableGroups[0]!;
        setValue("groupId", firstGroup.id);
        setValue("groupPrice", firstGroup.price);
        setValue("finalPrice", Math.max(0, firstGroup.price - discountValue));
      }
    }
  }, [selectedClassId, availableGroups, selectedGroupId, discountValue, setValue]);

  // When group changes, update group base price
  const handleGroupChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newGroupId = e.target.value;
    setValue("groupId", newGroupId);
    const grp = groups.find((g) => g.id === newGroupId);
    if (grp) {
      setValue("groupPrice", grp.price);
      setValue("finalPrice", Math.max(0, grp.price - discountValue));
    }
  };

  // Recalculate final price when discount or groupPrice changes
  const currentGroupPrice = watch("groupPrice") || 0;
  const calculatedFinalPrice = Math.max(0, currentGroupPrice - discountValue);

  // Handle Photo upload
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate size (max 4MB)
    if (file.size > 4 * 1024 * 1024) {
      setUploadError("حجم الصورة يجب ألا يتجاوز 4 ميجابايت");
      return;
    }

    setUploadError(null);
    setIsUploadingPhoto(true);

    // Show local preview immediately
    const localUrl = URL.createObjectURL(file);
    setPhotoPreview(localUrl);

    try {
      // Compress image client-side to max 400x400 at 82% quality (WebP)
      const compressedFile = await compressImage(file, {
        maxWidth: 400,
        maxHeight: 400,
        quality: 0.82,
        mimeType: "image/webp",
      });

      if (storage) {
        const storagePath = `student-photos/${Date.now()}_${Math.random().toString(36).slice(2, 8)}.webp`;
        const storageRef = ref(storage, storagePath);
        await uploadBytes(storageRef, compressedFile);
        const downloadUrl = await getDownloadURL(storageRef);
        setValue("photoUrl", downloadUrl);
        setPhotoPreview(downloadUrl);
      } else {
        // Fallback: convert to base64 Data URL if storage bucket is not configured
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64 = reader.result as string;
          setValue("photoUrl", base64);
          setPhotoPreview(base64);
        };
        reader.readAsDataURL(compressedFile);
      }
    } catch {
      // If upload failed (e.g. Firebase rules/offline), fallback to base64 data url
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        setValue("photoUrl", base64);
        setPhotoPreview(base64);
      };
      reader.readAsDataURL(file);
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  const handleFormSubmit = (data: StudentFormData) => {
    data.finalPrice = calculatedFinalPrice;
    data.groupPrice = currentGroupPrice;
    return onSubmit(data);
  };

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6" dir="rtl">
      {/* 1. Student Personal & Contact Details */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <User className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">بيانات الطالب الأساسية</CardTitle>
          </div>
          <CardDescription>أدخل اسم الطالب ورقم هاتفه والصورة الشخصية.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-6 items-start">
            {/* Photo Upload Box */}
            <div className="flex flex-col items-center gap-2 shrink-0">
              <div className="relative group flex h-28 w-28 items-center justify-center rounded-2xl border-2 border-dashed border-border bg-surface hover:border-primary transition-all overflow-hidden">
                {photoPreview ? (
                  <Image
                    src={photoPreview}
                    alt="صورة الطالب"
                    fill
                    sizes="112px"
                    className="object-cover"
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center text-muted p-2 text-center">
                    <Camera className="h-8 w-8 stroke-[1.5] mb-1" />
                    <span className="text-[11px] font-medium">صورة الطالب</span>
                  </div>
                )}

                <label className="absolute inset-0 flex flex-col items-center justify-center bg-background/80 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer text-text">
                  <Upload className="h-5 w-5 mb-1 text-primary" />
                  <span className="text-[10px] font-bold">
                    {photoPreview ? "تغيير الصورة" : "رفع صورة"}
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoUpload}
                    className="hidden"
                    disabled={isUploadingPhoto || isSubmitting}
                  />
                </label>
              </div>

              {isUploadingPhoto && (
                <span className="text-[11px] text-primary animate-pulse">جاري الرفع...</span>
              )}
              {uploadError && (
                <span className="text-[11px] text-danger text-center max-w-[140px]">
                  {uploadError}
                </span>
              )}
              <span className="text-[10px] text-muted">صيغة JPG/PNG (اختياري)</span>
            </div>

            {/* Name & Phone Fields */}
            <div className="flex-1 w-full space-y-4">
              <FormField label="اسم الطالب الرباعي" required error={errors.name?.message}>
                <Input
                  placeholder="مثال: أحمد محمود إبراهيم السيد"
                  {...register("name")}
                  error={!!errors.name}
                />
              </FormField>

              <FormField
                label="رقم هاتف الطالب (واتساب)"
                required
                error={errors.phone?.message}
                description="يُستخدم في إرسال تقارير الحضور والتنبيهات."
              >
                <div className="relative">
                  <Input
                    placeholder="01012345678"
                    {...register("phone")}
                    error={!!errors.phone}
                    className="pl-9"
                    dir="ltr"
                  />
                  <Phone className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
                </div>
              </FormField>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 2. Academic Enrollment (Class & Group) */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Layers className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">التسكين الأكاديمي</CardTitle>
          </div>
          <CardDescription>اختر الصف الدراسي والمجموعة المناسبة لمواعيد الطالب.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Class */}
            <FormField label="الصف الدراسي" required error={errors.classId?.message}>
              <Select {...register("classId")} error={!!errors.classId}>
                {classes.length === 0 ? (
                  <option value="">لا توجد صفوف دراسية</option>
                ) : (
                  classes.map((cls) => (
                    <option key={cls.id} value={cls.id}>
                      {cls.name}
                    </option>
                  ))
                )}
              </Select>
            </FormField>

            {/* Group */}
            <FormField label="المجموعة الدراسية" required error={errors.groupId?.message}>
              <Select
                {...register("groupId")}
                onChange={handleGroupChange}
                error={!!errors.groupId}
              >
                {availableGroups.length === 0 ? (
                  <option value="">لا توجد مجموعات بهذا الصف - أنشئ مجموعة أولاً</option>
                ) : (
                  availableGroups.map((grp) => (
                    <option key={grp.id} value={grp.id}>
                      {grp.name} ({grp.price} ج.م)
                    </option>
                  ))
                )}
              </Select>
            </FormField>
          </div>
        </CardContent>
      </Card>

      {/* 3. Parent Details */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">بيانات ولي الأمر</CardTitle>
          </div>
          <CardDescription>
            بيانات التواصل لربط بوابة ولي الأمر وإشعارات الحضور والغياب.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField label="اسم ولي الأمر" required error={errors.parentName?.message}>
              <Input
                placeholder="مثال: محمود إبراهيم السيد (الأب)"
                {...register("parentName")}
                error={!!errors.parentName}
              />
            </FormField>

            <FormField
              label="رقم هاتف ولي الأمر (واتساب)"
              required
              error={errors.parentPhone?.message}
            >
              <div className="relative">
                <Input
                  placeholder="01112345678"
                  {...register("parentPhone")}
                  error={!!errors.parentPhone}
                  className="pl-9"
                  dir="ltr"
                />
                <Phone className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
              </div>
            </FormField>
          </div>
        </CardContent>
      </Card>

      {/* 4. Financial Calculation (Group Price, Discount, Final Price) */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Calculator className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">الحساب المالي والاشتراك الشهري</CardTitle>
          </div>
          <CardDescription>
            احتساب السعر النهائي المستحق على الطالب شهرياً بعد تطبيق الخصم الفردي.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Base Group Price */}
            <div>
              <label className="text-xs font-semibold text-muted block mb-1.5">
                سعر المجموعة الأساسي
              </label>
              <div className="flex h-10 items-center justify-between rounded-lg border border-border bg-surface/60 px-3 text-sm font-bold text-text">
                <span>{currentGroupPrice} ج.م</span>
                <span className="text-[11px] text-muted">شهرياً</span>
              </div>
            </div>

            {/* Individual Discount */}
            <FormField
              label="الخصم الفردي للطالب (ج.م)"
              error={errors.discount?.message}
              description="أدخل 0 في حالة عدم وجود خصم خاص."
            >
              <div className="relative">
                <Input
                  type="number"
                  min="0"
                  step="any"
                  placeholder="0"
                  {...register("discount", { valueAsNumber: true })}
                  error={!!errors.discount}
                  className="pl-9 font-semibold"
                />
                <DollarSign className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
              </div>
            </FormField>

            {/* Final Price Result */}
            <div>
              <label className="text-xs font-bold text-primary block mb-1.5">
                السعر النهائي المستحق (شهرياً)
              </label>
              <div className="flex h-10 items-center justify-between rounded-lg border-2 border-primary/30 bg-primary/10 px-3.5 text-sm font-black text-primary">
                <span>{calculatedFinalPrice} ج.م</span>
                {discountValue > 0 && (
                  <Badge variant="success" size="sm">
                    خصم {discountValue} ج.م
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 5. Status & Block Management */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">حالة حساب الطالب</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField label="حالة الطالب" required error={errors.status?.message}>
              <Select {...register("status")} error={!!errors.status}>
                <option value="active">نشط (حساب مفعّل ويُسجل له حضور وامتحانات)</option>
                <option value="blocked">محظور (ممنوع من تسجيل الحضور ودخول الحصص)</option>
              </Select>
            </FormField>

            {currentStatus === "blocked" && (
              <FormField
                label="سبب الحظر"
                error={errors.blockReason?.message}
                description="سبب إيقاف الطالب مؤقتاً."
              >
                <Input
                  placeholder="مثال: عدم سداد المصروفات، سلوك غير لائق..."
                  {...register("blockReason")}
                  error={!!errors.blockReason}
                />
              </FormField>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Submit Buttons */}
      <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
        <Link href="/students">
          <Button type="button" variant="secondary" disabled={isSubmitting}>
            إلغاء
          </Button>
        </Link>
        <Button
          type="submit"
          isLoading={isSubmitting || isUploadingPhoto}
          className="font-bold min-w-[150px]"
        >
          {isEdit ? "حفظ التعديلات" : "إضافة الطالب وتوليد الرموز"}
        </Button>
      </div>
    </form>
  );
}
