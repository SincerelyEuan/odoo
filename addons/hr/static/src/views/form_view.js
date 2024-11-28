/** @odoo-module */

import { registry } from "@web/core/registry";

import { formView } from "@web/views/form/form_view";
import { FormController } from "@web/views/form/form_controller";

import { useArchiveEmployee } from "@hr/views/archive_employee_hook";

export class EmployeeFormController extends FormController {
    setup() {
        super.setup();
        this.archiveEmployee = useArchiveEmployee();
    }

    getStaticActionMenuItems() {
        const menuItems = super.getStaticActionMenuItems();

        // Ensure 'menuItems.archive' exists before attempting to assign 'callback'
        if (menuItems.archive) {
            menuItems.archive.callback = this.archiveEmployee.bind(this, this.model.root.resId);
        } else {
            console.warn("menuItems.archive is undefined or not an object. Skipping callback assignment.");
        }

        return menuItems;
    }
}

registry.category("views").add("hr_employee_form", {
    ...formView,
    Controller: EmployeeFormController,
});
