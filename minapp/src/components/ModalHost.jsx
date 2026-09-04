import React from 'react';
import { useStore } from '../store';

export default function ModalHost() {
  const { modal, closeModal } = useStore();
  if (!modal) return null;
  return null; // مودال‌ها در صفحات خودشان مدیریت می‌شوند
}
