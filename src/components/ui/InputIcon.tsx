import React from "react";
import CenterIcon from "./CenterIcon";

export interface InputIconProps {
  icon: React.ElementType | React.ReactNode;
  className?: string;
}

export const InputIcon: React.FC<InputIconProps> = ({ icon, className = "" }) => {
  return <CenterIcon className={`transition-colors duration-200 ${className}`} icon={icon} />;
};

export default InputIcon;
