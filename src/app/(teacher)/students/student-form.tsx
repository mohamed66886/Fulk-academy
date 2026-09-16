"use client";

import * as React from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { useClassesForSelect, useGroups } from "@/hooks/use-cached-data";
import {
  createStudentClient,
  updateStudentClient,
  deleteStudentClient,
} from "@/lib/client-actions/students";
import { studentSchema, type StudentFormData } from "@/lib/validators/student";
import { storage } from "@/lib/firebase/client";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { compressImage } from "@/lib/utils/image-compression";
import { EntityForm } from "@/components/ui/EntityForm";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/components/ui/toast";
import {
  Users,
  User,
  Phone,
  Layers,
  DollarSign,
  Camera,
  Upload,
  Calculator,
  AlertCircle,
  IdCard,
} from "lucide-react";

export interface StudentFormProps {
  initialData?: Partial<StudentFormData> & { id?: string };
  isEdit?: boolean;
  initialClasses?: Array<{ id: string; name: string }>;
  initialGroups?: Array<{ id: string; name: string; classId: string; price: number }>;
  defaultClassId?: string;
  defaultGroupId?: string;
  // Backwards compatibility props
  classes?: Array<{ id: string; name: string }>;
  groups?: Array<{ id: string; name: string; classId: string; price: number }>;
  onSubmit?: (data: StudentFormData) => Promise<void>;
  isSubmitting?: boolean;
}

export function StudentForm({
  initialData,
  isEdit = false,
  initialClasses,
  initialGroups,
  defaultClassId,
  defaultGroupId,
  classes: passedClasses,
  groups: passedGroups,
  onSubmit: externalOnSubmit,
  isSubmitting: externalIsSubmitting,
}: StudentFormProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const studentId = initialData?.id;

  // Cached data
  const { data: cachedClasses } = useClassesForSelect();
  const { data: cachedGroupsData } = useGroups();

  const classesList = React.useMemo(
    () => passedClasses || initialClasses || cachedClasses || [],
    [passedClasses, initialClasses, cachedClasses]
  );

  const groupsList = React.useMemo(() => {
    if (passedGroups) return passedGroups;
    if (initialGroups) return initialGroups;
    if (cachedGroupsData?.success && cachedGroupsData.groups) {
      return cachedGroupsData.groups.map((g) => ({
        id: g.id,
        name: g.name,
        classId: g.classId,
        price: g.price,
      }));
    }
    return [];
  }, [passedGroups, initialGroups, cachedGroupsData]);

  // Photo State
  const [photoPreview, setPhotoPreview] = React.useState<string | null>(
    initialData?.photoUrl || null
  );
  const [isUploadingPhoto, setIsUploadingPhoto] = React.useState(false);
  const [uploadError, setUploadError] = React.useState<string | null>(null);

  // Form State
  const [formData, setFormData] = React.useState<StudentFormData>({
    name: initialData?.name || "",
    phone: initialData?.phone || "",
    classId: initialData?.classId || defaultClassId || "",
    groupId: initialData?.groupId || defaultGroupId || "",
    parentName: initialData?.parentName || "",
    parentPhone: initialData?.parentPhone || "",
    photoUrl: initialData?.photoUrl || "",
    discount: initialData?.discount || 0,
    groupPrice: initialData?.groupPrice !== undefined ? initialData.groupPrice : 0,
    finalPrice: initialData?.finalPrice !== undefined ? initialData.finalPrice : 0,
    status: initialData?.status || "active",
    blockReason: initialData?.blockReason || "",
  });

  const [fieldErrors, setFieldErrors] = React.useState<Record<string, string>>({});
  const [isDeleting, setIsDeleting] = React.useState(false);

  // Filter groups according to selected class
  const availableGroups = React.useMemo(() => {
    if (!formData.classId) return groupsList;
    return groupsList.filter((g) => g.classId === formData.classId);
  }, [groupsList, formData.classId]);

  // Synchronize class & group on initial load
  React.useEffect(() => {
    if (!formData.classId && classesList.length > 0) {
      const selectedCls = defaultClassId || classesList[0]!.id;
      setFormData((prev) => ({ ...prev, classId: selectedCls }));
    }
  }, [classesList, formData.classId, defaultClassId]);

  React.useEffect(() => {
    if (availableGroups.length > 0) {
      const isCurrentGroupInClass = availableGroups.some((g) => g.id === formData.groupId);
      if (!isCurrentGroupInClass) {
        const targetGroup =
          availableGroups.find((g) => g.id === defaultGroupId) || availableGroups[0]!;
        setFormData((prev) => ({
          ...prev,
          groupId: targetGroup.id,
          groupPrice: targetGroup.price,
          finalPrice: Math.max(0, targetGroup.price - (Number(prev.discount) || 0)),
        }));
      }
    }
  }, [formData.classId, availableGroups, formData.groupId, defaultGroupId]);

  // Selected names for preview
  const selectedClassName = React.useMemo(() => {
    const found = classesList.find((c) => c.id === formData.classId);
    return found ? found.name : "";
  }, [classesList, formData.classId]);

  const selectedGroupName = React.useMemo(() => {
    const found = groupsList.find((g) => g.id === formData.groupId);
    return found ? found.name : "";
  }, [groupsList, formData.groupId]);

  // Recalculated final price
  const calculatedFinalPrice = Math.max(
    0,
    (Number(formData.groupPrice) || 0) - (Number(formData.discount) || 0)
  );

  // Group selection change handler
  const handleGroupChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newGroupId = e.target.value;
    const grp = groupsList.find((g) => g.id === newGroupId);
    const newPrice = grp ? grp.price : 0;
    setFormData((prev) => ({
      ...prev,
      groupId: newGroupId,
      groupPrice: newPrice,
      finalPrice: Math.max(0, newPrice - (Number(prev.discount) || 0)),
    }));
    if (fieldErrors.groupId) {
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next.groupId;
        return next;
      });
    }
  };

  // Photo Upload handler
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 4 * 1024 * 1024) {
      setUploadError("حجم الصورة يجب ألا يتجاوز 4 ميجابايت");
      return;
    }

    setUploadError(null);
    setIsUploadingPhoto(true);

    const localUrl = URL.createObjectURL(file);
    setPhotoPreview(localUrl);

    try {
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
        setFormData((prev) => ({ ...prev, photoUrl: downloadUrl }));
        setPhotoPreview(downloadUrl);
      } else {
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64 = reader.result as string;
          setFormData((prev) => ({ ...prev, photoUrl: base64 }));
          setPhotoPreview(base64);
        };
        reader.readAsDataURL(compressedFile);
      }
    } catch {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        setFormData((prev) => ({ ...prev, photoUrl: base64 }));
        setPhotoPreview(base64);
      };
      reader.readAsDataURL(file);
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  const handleSubmit = async () => {
    const payload: StudentFormData = {
      ...formData,
      discount: Number(formData.discount) || 0,
      groupPrice: Number(formData.groupPrice) || 0,
      finalPrice: calculatedFinalPrice,
    };

    // Client-side validation with Zod
    const validation = studentSchema.safeParse(payload);
    if (!validation.success) {
      const errors: Record<string, string> = {};
      validation.error.issues.forEach((issue) => {
        if (issue.path[0]) {
          errors[issue.path[0] as string] = issue.message;
        }
      });
      setFieldErrors(errors);
      return { success: false, error: "يرجى التحقق من صحة البيانات المدخلة" };
    }

    setFieldErrors({});

    if (externalOnSubmit) {
      try {
        await externalOnSubmit(validation.data);
        return { success: true };
      } catch (err: unknown) {
        return {
          success: false,
          error: err instanceof Error ? err.message : "فشل حفظ بيانات الطالب",
        };
      }
    }

    try {
      if (isEdit && studentId) {
        const res = await updateStudentClient(studentId, validation.data);
        if (!res.success) {
          return { success: false, error: res.error || "فشل تعديل بيانات الطالب" };
        }
        toast.success("تم تحديث بيانات الطالب بنجاح!");
        queryClient.invalidateQueries({ queryKey: ["students"] });
        queryClient.invalidateQueries({ queryKey: ["dashboard"] });
        return { success: true };
      } else {
        const res = await createStudentClient(validation.data);
        if (!res.success) {
          return { success: false, error: res.error || "فشل تسجيل الطالب" };
        }
        toast.success("تم تسجيل الطالب وتوليد أكواد الـ QR والباركود بنجاح!");
        queryClient.invalidateQueries({ queryKey: ["students"] });
        queryClient.invalidateQueries({ queryKey: ["dashboard"] });
        return { success: true };
      }
    } catch {
      return { success: false, error: "حدث خطأ غير متوقع أثناء حفظ بيانات الطالب" };
    }
  };

  const handleDelete = async () => {
    if (!studentId) return;
    setIsDeleting(true);
    try {
      const res = await deleteStudentClient(studentId);
      if (!res.success) {
        toast.error(res.error || "فشل حذف الطالب");
        return;
      }
      toast.success("تم نقل الطالب إلى سلة المحذوفات بنجاح");
      queryClient.invalidateQueries({ queryKey: ["students"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      router.push("/students");
    } catch {
      toast.error("حدث خطأ أثناء محاولة الحذف");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto" dir="rtl">
      <EntityForm
        title={isEdit ? "تعديل بيانات الطالب" : "تسجيل طالب جديد"}
        description={
          isEdit
            ? "تحديث بيانات الاتصال، التسكين في مجموعة أخرى، أو تعديل الخصم الفردي."
            : "أدخل بيانات الطالب، تسكينه في المجموعة، وإصدار أكواد الدخول وبطاقة الحضور."
        }
        icon={Users}
        iconColor="text-primary"
        badge={
          isEdit ? (
            <Badge variant={formData.status === "active" ? "success" : "danger"} size="sm">
              {formData.status === "active" ? "نشط" : "محظور"}
            </Badge>
          ) : undefined
        }
        isEdit={isEdit}
        onSubmit={handleSubmit}
        isLoading={externalIsSubmitting || isUploadingPhoto}
        submitText={isEdit ? "حفظ التعديلات" : "تسجيل الطالب وتوليد الرموز"}
        cancelHref={isEdit && studentId ? `/students/${studentId}` : "/students"}
        previewHref="/students"
        tableHref="/students"
        previewText="معاينة سجل الطلاب"
        continueText={isEdit ? "الذهاب لبروفايل الطالب" : "تسجيل طالب آخر"}
        onContinue={() => {
          if (isEdit && studentId) {
            router.push(`/students/${studentId}`);
          } else {
            setFormData({
              name: "",
              phone: "",
              classId: defaultClassId || classesList[0]?.id || "",
              groupId: defaultGroupId || "",
              parentName: "",
              parentPhone: "",
              photoUrl: "",
              discount: 0,
              groupPrice: 0,
              finalPrice: 0,
              status: "active",
              blockReason: "",
            });
            setPhotoPreview(null);
            setFieldErrors({});
          }
        }}
        showSuccessModal={true}
        successModalTitle={isEdit ? "تم تحديث بيانات الطالب بنجاح" : "تم تسجيل الطالب بنجاح"}
        successModalDescription={
          isEdit
            ? "تم حفظ التعديلات الجديدة على بيانات واشتراك الطالب بنجاح."
            : "تم تسجيل الطالب في المجموعة بنجاح وتوليد أكواد الـ QR والباركود القصير. يمكنك طباعة الكارت فوراً أو تسجيل طالب آخر."
        }
        onDelete={isEdit && studentId ? handleDelete : undefined}
        deleteText="حذف الطالب"
        isDeleting={isDeleting}
        columns={2}
      >
        {/* Photo Upload Box (Spans 2 cols on mobile/desktop) */}
        <div className="md:col-span-2 flex flex-col sm:flex-row items-center sm:items-start gap-5 p-4 rounded-2xl border border-border/80 bg-surface/30">
          <div className="relative group flex h-24 w-24 shrink-0 items-center justify-center rounded-2xl border-2 border-dashed border-border bg-surface hover:border-primary transition-all overflow-hidden">
            {photoPreview ? (
              <Image
                src={photoPreview}
                alt="صورة الطالب"
                fill
                sizes="96px"
                className="object-cover"
              />
            ) : (
              <div className="flex flex-col items-center justify-center text-muted p-2 text-center">
                <Camera className="h-7 w-7 stroke-[1.5] mb-1" />
                <span className="text-[10px] font-medium">صورة الطالب</span>
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
                disabled={isUploadingPhoto}
              />
            </label>
          </div>

          <div className="flex flex-col justify-center text-right space-y-1">
            <h4 className="text-sm font-bold text-text flex items-center gap-1.5">
              <User className="h-4 w-4 text-primary" />
              <span>الصورة الشخصية للطالب (اختياري)</span>
            </h4>
            <p className="text-xs text-muted leading-relaxed">
              تُطبع الصورة على كارت الحضور الذكي لتسهيل التحقق والتعرف البصري السريع على الطالب.
            </p>
            {isUploadingPhoto && (
              <span className="text-xs text-primary font-semibold animate-pulse">
                جاري رفع الصورة وضغطها...
              </span>
            )}
            {uploadError && (
              <span className="text-xs text-danger font-semibold">{uploadError}</span>
            )}
          </div>
        </div>

        {/* Student Name */}
        <Input
          id="name"
          name="name"
          label="اسم الطالب الرباعي"
          required
          placeholder="مثال: أحمد محمود إبراهيم السيد"
          value={formData.name}
          onChange={(e) => {
            setFormData((prev) => ({ ...prev, name: e.target.value }));
            if (fieldErrors.name) {
              setFieldErrors((prev) => {
                const next = { ...prev };
                delete next.name;
                return next;
              });
            }
          }}
          error={fieldErrors.name}
          leftIcon={<User className="w-4 h-4 text-slate-400" />}
          sizeVariant="md"
        />

        {/* Student Phone */}
        <Input
          id="phone"
          name="phone"
          label="رقم هاتف الطالب (واتساب)"
          required
          placeholder="01012345678"
          dir="ltr"
          value={formData.phone}
          onChange={(e) => {
            setFormData((prev) => ({ ...prev, phone: e.target.value }));
            if (fieldErrors.phone) {
              setFieldErrors((prev) => {
                const next = { ...prev };
                delete next.phone;
                return next;
              });
            }
          }}
          error={fieldErrors.phone}
          leftIcon={<Phone className="w-4 h-4 text-slate-400" />}
          sizeVariant="md"
        />

        {/* Class Selection */}
        <Select
          id="classId"
          name="classId"
          label="الصف الدراسي"
          required
          value={formData.classId}
          onChange={(e) => {
            const newClassId = e.target.value;
            const newGroups = groupsList.filter((g) => g.classId === newClassId);
            const firstGroup = newGroups[0];
            setFormData((prev) => ({
              ...prev,
              classId: newClassId,
              groupId: firstGroup ? firstGroup.id : "",
              groupPrice: firstGroup ? firstGroup.price : 0,
              finalPrice: firstGroup
                ? Math.max(0, firstGroup.price - (Number(prev.discount) || 0))
                : 0,
            }));
            if (fieldErrors.classId) {
              setFieldErrors((prev) => {
                const next = { ...prev };
                delete next.classId;
                return next;
              });
            }
          }}
          error={fieldErrors.classId}
          sizeVariant="md"
        >
          {classesList.length === 0 ? (
            <option value="">لا توجد صفوف دراسية</option>
          ) : (
            classesList.map((cls) => (
              <option key={cls.id} value={cls.id}>
                {cls.name}
              </option>
            ))
          )}
        </Select>

        {/* Group Selection */}
        <Select
          id="groupId"
          name="groupId"
          label="المجموعة الدراسية"
          required
          value={formData.groupId}
          onChange={handleGroupChange}
          error={fieldErrors.groupId}
          sizeVariant="md"
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

        {/* Parent Name */}
        <Input
          id="parentName"
          name="parentName"
          label="اسم ولي الأمر"
          required
          placeholder="مثال: محمود إبراهيم السيد (الأب)"
          value={formData.parentName}
          onChange={(e) => {
            setFormData((prev) => ({ ...prev, parentName: e.target.value }));
            if (fieldErrors.parentName) {
              setFieldErrors((prev) => {
                const next = { ...prev };
                delete next.parentName;
                return next;
              });
            }
          }}
          error={fieldErrors.parentName}
          leftIcon={<Users className="w-4 h-4 text-slate-400" />}
          sizeVariant="md"
        />

        {/* Parent Phone */}
        <Input
          id="parentPhone"
          name="parentPhone"
          label="رقم هاتف ولي الأمر (واتساب)"
          required
          placeholder="01112345678"
          dir="ltr"
          value={formData.parentPhone}
          onChange={(e) => {
            setFormData((prev) => ({ ...prev, parentPhone: e.target.value }));
            if (fieldErrors.parentPhone) {
              setFieldErrors((prev) => {
                const next = { ...prev };
                delete next.parentPhone;
                return next;
              });
            }
          }}
          error={fieldErrors.parentPhone}
          leftIcon={<Phone className="w-4 h-4 text-slate-400" />}
          sizeVariant="md"
        />

        {/* Financial Section (Spans 2 cols) */}
        <div className="md:col-span-2 space-y-3 pt-2">
          <div className="flex items-center gap-2 border-b border-border pb-2">
            <Calculator className="h-4 w-4 text-primary" />
            <h3 className="font-bold text-sm text-text">الحساب المالي والاشتراك الشهري</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
            {/* Base Group Price */}
            <div>
              <label className="text-xs font-semibold text-muted block mb-1.5">
                سعر المجموعة الأساسي
              </label>
              <div className="flex h-9.5 items-center justify-between rounded-md border border-border bg-surface/60 px-3 text-sm font-bold text-text">
                <span>{formData.groupPrice || 0} ج.م</span>
                <span className="text-[11px] text-muted">شهرياً</span>
              </div>
            </div>

            {/* Individual Discount */}
            <Input
              id="discount"
              name="discount"
              type="number"
              min="0"
              step="any"
              label="الخصم الفردي للطالب (ج.م)"
              placeholder="0"
              value={formData.discount !== undefined ? formData.discount.toString() : "0"}
              onChange={(e) => {
                const val = parseFloat(e.target.value) || 0;
                setFormData((prev) => ({
                  ...prev,
                  discount: val,
                  finalPrice: Math.max(0, (Number(prev.groupPrice) || 0) - val),
                }));
                if (fieldErrors.discount) {
                  setFieldErrors((prev) => {
                    const next = { ...prev };
                    delete next.discount;
                    return next;
                  });
                }
              }}
              error={fieldErrors.discount}
              leftIcon={<DollarSign className="w-4 h-4 text-slate-400" />}
              sizeVariant="md"
            />

            {/* Final Price Result */}
            <div>
              <label className="text-xs font-bold text-primary block mb-1.5">
                السعر النهائي المستحق (شهرياً)
              </label>
              <div className="flex h-9.5 items-center justify-between rounded-md border-2 border-primary/30 bg-primary/10 px-3.5 text-sm font-black text-primary">
                <span>{calculatedFinalPrice} ج.م</span>
                {Number(formData.discount) > 0 && (
                  <Badge variant="success" size="sm">
                    خصم {formData.discount} ج.م
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Status & Block Reason (Spans 2 cols) */}
        <div className="md:col-span-2 space-y-3 pt-2">
          <div className="flex items-center gap-2 border-b border-border pb-2">
            <AlertCircle className="h-4 w-4 text-primary" />
            <h3 className="font-bold text-sm text-text">حالة حساب الطالب</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Select
              id="status"
              name="status"
              label="حالة الطالب"
              value={formData.status}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  status: e.target.value as "active" | "blocked",
                }))
              }
              searchable={false}
              sizeVariant="md"
            >
              <option value="active">نشط (حساب مفعّل ويُسجل له حضور وامتحانات)</option>
              <option value="blocked">محظور (ممنوع من تسجيل الحضور ودخول الحصص)</option>
            </Select>

            {formData.status === "blocked" && (
              <Input
                id="blockReason"
                name="blockReason"
                label="سبب الحظر"
                placeholder="مثال: عدم سداد المصروفات، سلوك غير لائق..."
                value={formData.blockReason || ""}
                onChange={(e) => setFormData((prev) => ({ ...prev, blockReason: e.target.value }))}
                error={fieldErrors.blockReason}
                sizeVariant="md"
              />
            )}
          </div>
        </div>

        {/* Live Preview Section (Spans 2 cols) */}
        {formData.name.trim() && (
          <div className="md:col-span-2 p-4 rounded-xl border border-primary/20 bg-primary/5 space-y-3 transition-all">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-primary font-bold text-xs">
                <IdCard className="w-4 h-4" />
                <span>معاينة فورية لكارت الطالب (Live Preview)</span>
              </div>
              <div className="flex items-center gap-2">
                {selectedClassName && (
                  <span className="inline-flex items-center gap-1 rounded bg-secondary px-2 py-0.5 text-xs font-semibold text-text">
                    <Layers className="h-3 w-3 text-muted" />
                    {selectedClassName}
                  </span>
                )}
                {selectedGroupName && (
                  <span className="inline-flex items-center rounded bg-primary/15 px-2 py-0.5 text-xs font-bold text-primary">
                    {selectedGroupName}
                  </span>
                )}
                <Badge variant={formData.status === "active" ? "success" : "danger"} size="sm">
                  {formData.status === "active" ? "نشط" : "محظور"}
                </Badge>
              </div>
            </div>

            <div className="flex items-center gap-4 border-t border-primary/10 pt-3">
              <div className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/20 text-primary font-black overflow-hidden text-base">
                {photoPreview ? (
                  <Image
                    src={photoPreview}
                    alt={formData.name}
                    fill
                    sizes="48px"
                    className="object-cover"
                  />
                ) : (
                  <span>{formData.name.charAt(0)}</span>
                )}
              </div>

              <div className="flex flex-col text-right">
                <h4 className="font-bold text-sm text-text">{formData.name}</h4>
                <div className="flex flex-wrap items-center gap-3 text-xs text-muted mt-0.5">
                  <span>
                    هاتف: <strong className="font-mono text-text">{formData.phone || "---"}</strong>
                  </span>
                  <span>
                    ولي الأمر: <strong className="text-text">{formData.parentName || "---"}</strong>{" "}
                    ({formData.parentPhone || "---"})
                  </span>
                  <span>
                    الاشتراك:{" "}
                    <strong className="text-primary font-bold">{calculatedFinalPrice} ج.م</strong>
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </EntityForm>
    </div>
  );
}

export default StudentForm;
