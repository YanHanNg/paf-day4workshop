import { HttpClient } from '@angular/common/http';
import { Component, ElementRef, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  @ViewChild('imageFile', { static: false }) imageFile: ElementRef;

  title = 'frontend';

  res_image: string;
  res_image_key : string;

  constructor(private fb: FormBuilder, private http: HttpClient) { }

  form: FormGroup = this.fb.group({
    imageFileName : this.fb.control('', [Validators.required]),
    uploader: this.fb.control('', [Validators.required]),
    note: this.fb.control('', [Validators.required])
  })
  
  onSubmit() {
    let formData = new FormData();
    formData.set('uploader', this.form.get('uploader').value);
    formData.set('note', this.form.get('note').value);
    formData.set('name', this.form.get('imageFileName').value);
    formData.set('type', this.imageFile.nativeElement.files[0].type);
    formData.set('size', this.imageFile.nativeElement.files[0].size);
    //this image-file must match the backend
    formData.set('image-file', this.imageFile.nativeElement.files[0]);
  
    this.http.post('http://localhost:3000/upload', formData)
      .pipe()
      .toPromise()
      .then(data => {
        console.info(data);
        //@ts-ignore
        //this.res_image = data.res_image;
        this.res_image_key = data.res_image_key;
        
        //Fetch from Server as base64
        this.http.get(`http://localhost:3000/blob/${this.res_image_key}`)
          .toPromise()
          .then(data => {
            //@ts-ignore
            this.res_image = data.res_image;
          })
      })
      .catch(err=> { console.error('Error', err)});
  }
}
