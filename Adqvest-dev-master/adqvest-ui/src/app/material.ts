import { NgModule } from '@angular/core';
import {ScrollingModule as ScrollDispatchModule} from '@angular/cdk/scrolling';
import {DragDropModule} from '@angular/cdk/drag-drop';

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
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatRadioModule } from '@angular/material/radio';
import { MatSelectModule } from '@angular/material/select';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatSliderModule } from '@angular/material/slider';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatSortModule } from '@angular/material/sort';
import { MatTabsModule } from '@angular/material/tabs';
import { MatTableModule } from '@angular/material/table';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatGridListModule } from '@angular/material/grid-list';

@NgModule({
    imports: [MatButtonModule,MatCheckboxModule,MatToolbarModule,MatFormFieldModule,MatIconModule,MatInputModule,MatCardModule,MatSelectModule, MatSnackBarModule,MatProgressSpinnerModule,MatTooltipModule,MatListModule,MatMenuModule,MatTableModule,MatSortModule,MatRadioModule,MatSliderModule,MatDatepickerModule,MatBadgeModule,MatDialogModule,MatChipsModule,ScrollDispatchModule,MatAutocompleteModule,MatTabsModule,MatExpansionModule,MatSidenavModule,MatGridListModule, DragDropModule],
    exports :[MatButtonModule,MatCheckboxModule,MatToolbarModule,MatFormFieldModule,MatIconModule,MatInputModule,MatCardModule,MatSelectModule,MatSnackBarModule,MatProgressSpinnerModule,MatTooltipModule,MatListModule,MatMenuModule,MatTableModule,MatSortModule,MatRadioModule,MatSliderModule,MatDatepickerModule,MatBadgeModule,MatDialogModule,MatChipsModule,ScrollDispatchModule,MatAutocompleteModule,MatTabsModule,MatExpansionModule,MatSidenavModule,MatGridListModule,DragDropModule]
})

export class MaterialModule {}