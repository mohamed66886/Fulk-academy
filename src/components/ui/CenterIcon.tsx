import React from "react";

export interface CenterIconProps extends React.HTMLAttributes<HTMLSpanElement> {
  icon?: React.ElementType | React.ReactNode;
  className?: string;
  children?: React.ReactNode;
}

export const CenterIcon: React.FC<CenterIconProps> = ({
  icon,
  className = "",
  children,
  ...props
}) => {
  const content = icon || children;

  const renderContent = () => {
    if (!content) return null;
    if (React.isValidElement(content)) {
      return content;
    }
    if (
      typeof content === "function" ||
      (typeof content === "object" &&
        content !== null &&
        ("render" in content || "$$typeof" in content))
    ) {
      const Component = content as React.ElementType;
      return <Component className="w-4 h-4" />;
    }
    if (typeof content === "string" || typeof content === "number") {
      return content;
    }
    return null;
  };

  return (
    <span className={`inline-flex items-center justify-center shrink-0 ${className}`} {...props}>
      {renderContent()}
    </span>
  );
};

export default CenterIcon;
