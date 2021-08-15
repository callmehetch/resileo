import { NgModule } from '@angular/core';
import {ScrollingModule as ScrollDispatchModule} from '@angular/cdk/scrolling';
import {MatTreeModule} from '@angular/material/tree';

import { MatBadgeModule } from '@angular/material/badge';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatChipsModule } from '@angular/material/chips';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatListModule } from '@angular/material/list';
import { MatMenuModule } from '@angular/material/menu';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatRadioModule } from '@angular/material/radio';
import { MatSelectModule } from '@angular/material/select';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatSliderModule } from '@angular/material/slider';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatSortModule } from '@angular/material/sort';
import { MatTableModule } from '@angular/material/table';
import { MatTabsModule } from '@angular/material/tabs';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatGridListModule } from '@angular/material/grid-list';

@NgModule({
    imports: [MatButtonModule,MatCheckboxModule,MatToolbarModule,MatFormFieldModule,MatIconModule,MatInputModule,MatCardModule,MatSelectModule, MatSnackBarModule,MatProgressSpinnerModule,MatTooltipModule,MatSidenavModule,MatListModule,MatMenuModule,MatTableModule,MatPaginatorModule,MatSortModule,MatRadioModule,MatSliderModule,MatDatepickerModule,MatBadgeModule,MatDialogModule,MatChipsModule,MatTabsModule,ScrollDispatchModule,MatTreeModule,MatProgressBarModule,MatGridListModule],
    exports :[MatButtonModule,MatCheckboxModule,MatToolbarModule,MatFormFieldModule,MatIconModule,MatInputModule,MatCardModule,MatSelectModule,MatSnackBarModule,MatProgressSpinnerModule,MatTooltipModule,MatSidenavModule,MatListModule,MatMenuModule,MatTableModule,MatPaginatorModule,MatSortModule,MatRadioModule,MatSliderModule,MatDatepickerModule,MatBadgeModule,MatDialogModule,MatChipsModule,MatTabsModule,ScrollDispatchModule,MatTreeModule,MatProgressBarModule,MatGridListModule]
})

export class MaterialModule {}