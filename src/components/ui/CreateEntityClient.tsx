"use client";

import React from "react";

/**
 * Result returned by create actions across ERP modules
 */
export type CreateActionResult = {
  success: boolean;
  id?: string;
  error?: string;
};

/**
 * Props passed to the FormComponent or render prop
 */
export interface EntityFormRenderProps<T = unknown> {
  tenantId: string;
  companyId: string;
  onSubmit: (data: T) => Promise<CreateActionResult>;
  [key: string]: unknown;
}

export interface CreateEntityClientProps<T = unknown> {
  /** معرّف المستأجر الحالي */
  tenantId: string;
  /** معرّف الشركة الحالية */
  companyId: string;
  /** دالة الخادم لإنشاء السجل في قاعدة البيانات */
  createAction: (tenantId: string, companyId: string, data: T) => Promise<CreateActionResult>;
  /** كمبوننت الفورم الخاص بالكيان (مثل UnitForm, CategoryForm) */
  FormComponent?: React.ComponentType<EntityFormRenderProps<T>>;
  /** خصائص إضافية يتم تمريرها إلى الفورم */
  formProps?: Record<string, unknown>;
  /** دالة Render Prop بديلة لتخصيص محتوى الفورم */
  children?: (props: EntityFormRenderProps<T>) => React.ReactNode;
  /** فئات تنسيق إضافية للحاوية */
  className?: string;
}

/**
 * CreateEntityClient
 * كمبوننت عام وموحد لصفحات الإضافة (New / Create Pages)
 * يقوم بربط دالة الإضافة (createAction) بالفورم تلقائياً دون الحاجة لتكرار Boilerplate في كل صفحة.
 *
 * @example
 * // الاستخدام المباشر مع FormComponent:
 * <CreateEntityClient
 *   tenantId={tenantId}
 *   companyId={companyId}
 *   createAction={createUnit}
 *   FormComponent={UnitForm}
 * />
 *
 * @example
 * // الاستخدام مع Render Prop / Children:
 * <CreateEntityClient
 *   tenantId={tenantId}
 *   companyId={companyId}
 *   createAction={createUnit}
 * >
 *   {({ tenantId, onSubmit }) => (
 *     <UnitForm tenantId={tenantId} onSubmit={onSubmit} />
 *   )}
 * </CreateEntityClient>
 */
export function CreateEntityClient<T = unknown>({
  tenantId,
  companyId,
  createAction,
  FormComponent,
  formProps = {},
  children,
  className,
}: CreateEntityClientProps<T>) {
  const handleSubmit = async (data: T): Promise<CreateActionResult> => {
    return await createAction(tenantId, companyId, data);
  };

  const renderProps: EntityFormRenderProps<T> = {
    tenantId,
    companyId,
    onSubmit: handleSubmit,
    ...formProps,
  };

  return (
    <div className={className}>
      {children ? children(renderProps) : FormComponent ? <FormComponent {...renderProps} /> : null}
    </div>
  );
}

export default CreateEntityClient;
