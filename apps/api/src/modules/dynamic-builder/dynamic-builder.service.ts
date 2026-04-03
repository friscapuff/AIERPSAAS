import { Injectable } from '@nestjs/common';

interface DynamicFormDto {
  name: string;
  description?: string;
  fields: any[];
  metadata?: Record<string, any>;
}

@Injectable()
export class DynamicBuilderService {
  private forms: Map<string, any> = new Map();

  async getForms() {
    return Array.from(this.forms.values());
  }

  async getForm(id: string) {
    return this.forms.get(id);
  }

  async createForm(createFormDto: DynamicFormDto) {
    const id = Math.random().toString(36).substr(2, 9);
    const form = {
      id,
      ...createFormDto,
      createdAt: new Date(),
    };
    this.forms.set(id, form);
    return form;
  }

  async updateForm(id: string, updateFormDto: Partial<DynamicFormDto>) {
    const form = this.forms.get(id);
    if (!form) return null;

    const updated = { ...form, ...updateFormDto, updatedAt: new Date() };
    this.forms.set(id, updated);
    return updated;
  }

  async deleteForm(id: string) {
    this.forms.delete(id);
    return { id, deleted: true };
  }
}
