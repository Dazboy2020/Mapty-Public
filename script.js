'use strict';

class Workout {
  date = new Date();
  id = (Date.now() + '').slice(-10);
  clicks = 0;
  constructor(coords, distance, duration, location, flag) {
    this.coords = coords; // [lat, lng]
    this.distance = distance; // km
    this.duration = duration; // minutes
    this.location = location;
    this.flag = flag;
  }

  _setDescription() {
    const months = [
      'January',
      'February',
      'March',
      'April',
      'May',
      'June',
      'July',
      'August',
      'September',
      'October',
      'November',
      'December',
    ];
    this.description = `${this.type[0].toUpperCase()}${this.type.slice(
      1
    )} <br> ${months[this.date.getMonth()]} ${this.date.getDate()}`;
  }
  click() {
    this.clicks++;
  }
}

class Running extends Workout {
  type = 'running';
  constructor(coords, distance, duration, cadence, location, flag) {
    super(coords, distance, duration, location, flag);
    this.cadence = cadence;
    this.calcPace();
    this._setDescription();
  }

  calcPace() {
    //min per km
    this.pace = this.duration / this.distance;
    return this.pace;
  }
}

class Cycling extends Workout {
  type = 'cycling';
  constructor(coords, distance, duration, elevation, location, flag) {
    super(coords, distance, duration, location, flag);
    this.elevation = elevation;
    this.calcSpeed();
    this._setDescription();
  }

  calcSpeed() {
    // km / h
    this.speed = this.distance / (this.duration / 60);
    return this.speed;
  }
}

// ! APPLICATION ARCHITECTURE ! //

const form = document.querySelector('.form');
const containerWorkouts = document.querySelector('.workouts');
// types
const inputType = document.querySelector('.form__input--type');
const inputDistance = document.querySelector('.form__input--distance');
const inputDuration = document.querySelector('.form__input--duration');
const inputCadence = document.querySelector('.form__input--cadence');
const inputElevation = document.querySelector('.form__input--elevation');

//* Edit
const editbtn = document.querySelector('.edit__btn');
const editWorkoutForm = document.querySelector('.edit__workout');
const editForm = document.querySelector('.editForm');
// types
const edit_inputType = document.querySelector('.edit__form__input--type');
const edit_inputDistance = document.querySelector(
  '.edit__form__input--distance'
);
const edit_inputDuration = document.querySelector(
  '.edit__form__input--duration'
);
const edit_inputCadence = document.querySelector('.edit__form__input--cadence');
const edit_inputElevation = document.querySelector(
  '.edit__form__input--elevation'
);

class App {
  #map;
  #mapZoomLevel = 13;
  #mapEvent;
  #workouts = [];
  #markers = [];
  #editWorkouts = [];
  #city = [];
  #country = [];
  #flags = [];

  constructor() {
    //? Get User Position
    this._getPosition();

    //? Get data from local storage
    this._getLocalStorage();

    //?Event Handlers
    form.addEventListener('submit', this._newWorkout.bind(this));
    inputType.addEventListener('change', this._toggleElevationField);
    containerWorkouts.addEventListener('click', this._moveToPopup.bind(this));
    containerWorkouts.addEventListener('click', this._editWorkout.bind(this));
    editForm.addEventListener('submit', this._editWorkoutValues.bind(this));
    editForm.addEventListener('click', this._deleteEditTab.bind(this));
    edit_inputType.addEventListener('change', this._editToggleElevationField);
  }

  _getPosition() {
    if (navigator.geolocation)
      navigator.geolocation.getCurrentPosition(
        this._loadMap.bind(this),
        function () {
          alert('Could not get your position');
        }
      );

    if (this.#workouts.type === 'cycling') {
      document.getElementById('form__border').style.borderColor =
        'var(--color-brand--1)';
    } else {
      document.getElementById('form__border').style.borderColor =
        'var(--color-brand--2)';
    }
  }

  _loadMap(position) {
    const { latitude, longitude } = position.coords;
    const coords = [latitude, longitude];

    this.#map = L.map('map').setView(coords, this.#mapZoomLevel);

    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(this.#map);

    //? Clicks on map functionality
    this.#map.on('click', this._showForm.bind(this));

    this.#workouts.forEach(work => {
      this._renderWorkoutMarker(work);
    });
  }

  _showForm(mapE) {
    this.#mapEvent = mapE;
    editForm.classList.add('hidden');
    form.classList.remove('hidden');

    if (inputType.value === 'cycling') {
      document.getElementById('form__border').style.borderColor =
        'var(--color-brand--1)';
    } else {
      document.getElementById('form__border').style.borderColor =
        'var(--color-brand--2)';
    }
    setTimeout(() => (form.style.display = 'grid'), 1000);
  }

  _hideForm() {
    //Empty fields
    form.style.display = 'none';
    form.classList.add('hidden');
    setTimeout(() => (form.style.display = 'grid'), 1000);

    inputDuration.value =
      inputDistance.value =
      inputCadence.value =
      inputElevation.value =
        '';
  }

  _editToggleElevationField() {
    const type = edit_inputType.value;

    edit_inputElevation
      .closest('.form__row')
      .classList.toggle('form__row--hidden');
    edit_inputCadence
      .closest('.form__row')
      .classList.toggle('form__row--hidden');
  }

  _toggleElevationField() {
    inputElevation.closest('.form__row').classList.toggle('form__row--hidden');
    inputCadence.closest('.form__row').classList.toggle('form__row--hidden');

    const type = inputType.value;

    if (type === 'running') {
      document.getElementById('form__border').style.borderColor =
        'var(--color-brand--2)';
    }

    if (type === 'cycling') {
      document.getElementById('form__border').style.borderColor =
        'var(--color-brand--1)';
    }
  }

  _newWorkout(e) {
    e.preventDefault();
    const validInputs = (...inputs) =>
      inputs.every(inp => Number.isFinite(inp));

    const allPositive = (...inputs) => inputs.every(inp => inp > 0);

    e.preventDefault();
    //? Get data from the form

    const { lat, lng } = this.#mapEvent.latlng;
    let workout;

    fetch(
      `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=en`
    )
      .then(response => {
        if (!response.ok)
          throw new Error(`Unable retrieve workout city and country data`);
        return response.json();
      })
      .then(data => {
        console.log(data);
        this.#city.push(data.city);
        this.#country.push(data.countryName);

        return fetch(
          `https://restcountries.com/v3.1/alpha?codes=${data.countryCode}`
        );
      })
      .then(response => {
        if (!response.ok)
          throw new Error(`Country Not Found (${response.status})`);
        return response.json();
      })
      .then(data => {
        // console.log(data);
        this.#flags.push(data[0].flags.png);
        console.log(this.#flags);
      })

      .catch(err => {
        console.error(`${err}😠`);
        // renderError(`something went wrong ${err.message}`);
      })
      .finally(() => {
        const type = inputType.value;
        const distance = +inputDistance.value;
        const duration = +inputDuration.value;
        const location = this.#city.pop();
        const flag = this.#flags.pop();
        // this.#editLocation.push(location);

        //? if running: create new running object
        if (type === 'running') {
          const cadence = +inputCadence.value;
          //* Check if data is valid
          if (
            !validInputs(distance, duration, cadence) ||
            !allPositive(distance, duration, cadence)
          )
            return alert('Inputs have to be positive numbers!');
          workout = new Running(
            [lat, lng],
            distance,
            duration,
            cadence,
            location,
            flag
          );
        }

        //? if cycling: create cycing object
        if (type === 'cycling') {
          const elevation = +inputElevation.value;
          //* Check if data is valid
          if (
            !validInputs(distance, duration, elevation) ||
            !allPositive(distance, duration)
          )
            return alert('Inputs have to be positive numbers!');
          workout = new Cycling(
            [lat, lng],
            distance,
            duration,
            elevation,
            location,
            flag
          );
        }

        //? add object to the workout array
        this.#workouts.push(workout);

        //? render workout on map as marker
        this._renderWorkoutMarker(workout);

        //? Render workout as a list
        this._renderWorkout(workout, location, flag);

        //* Clear input fields
        this._hideForm();

        //* Local Storage
        this._setLocalStorage();
        //
      });
  }

  _renderWorkoutMarker(workout) {
    let currentMarker = L.marker(workout.coords);
    this.#markers.push(currentMarker);

    currentMarker
      .addTo(this.#map)
      .bindPopup(
        L.popup({
          maxWidth: 250,
          minWidth: 100,
          autoClose: false,
          closeOnClick: false,
          className: `${workout.type}-popup`,
        })
      )
      .setPopupContent(
        `${workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'} ${workout.description}`
      )
      .openPopup();

    currentMarker.addEventListener('mouseover', e =>
      console.log(this.#markers)
    );
  }

  _renderWorkout(workout) {
    let html = `

    <li class="workout workout--${workout.type}" data-id="${workout.id}">
      <h2 class="workout__title">${workout.location}: ${workout.description} 
          </h2>
          <div class="workout__details">
            <span class="workout__icon">${
              workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'
            }</span>
            <span class="workout__value">${workout.distance}</span>
            <span class="workout__unit">km</span>
          </div>
          <div class="workout__details">
            <span class="workout__icon">⏱</span>
            <span class="workout__value">${workout.duration}</span>
            <span class="workout__unit">min</span>

          </div>
          <img class="flag" src="${workout.flag}"  </img>

          <i class="fa-solid fa-trash-can fa-2xl"></i>
          <i class="fa-sharp fa-solid fa-pen-to-square fa-2xl"></i>    
          `;

    if (workout.type === 'running')
      html += `
        <div class="workout__details">
            <span class="workout__icon">⚡️</span>
            <span class="workout__value">${workout.pace.toFixed(1)}</span>
            <span class="workout__unit">min/km</span>
        </div>
        <div class="workout__details">
          <span class="workout__icon">🦶🏼</span>
          <span class="workout__value">${workout.cadence}</span>
          <span class="workout__unit">spm</span>
        </div>
        

    </li>
    `;

    if (workout.type === 'cycling')
      html += `
        <div class="workout__details">
            <span class="workout__icon">⚡️</span>
            <span class="workout__value">${workout.speed.toFixed(1)}</span>
            <span class="workout__unit">km/h</span>
        </div>
        <div class="workout__details">
            <span class="workout__icon">⛰</span>
            <span class="workout__value">${workout.elevation}</span>
            <span class="workout__unit">m</span>
        </div>
        <i class="fa-solid fa-trash-can fa-2xl"></i>
        <i class="fa-sharp fa-solid fa-pen-to-square fa-2xl"></i>    
        </li> 
      `;

    form.insertAdjacentHTML('afterend', html);
  }

  _deleteWorkout(id) {
    for (let i = 0; i < this.#workouts.length; i++) {
      if (this.#workouts[i].id == id) {
        this.#workouts.splice(i, 1);
        this.#markers[i].remove();
        this.#markers.splice(i, 1);
      }

      if (this.#workouts < 1) {
        editForm.classList.add('hidden');
      }
      this._setLocalStorage();
      setTimeout(() => (form.style.display = 'grid'), 1000);
    }
  }

  _deleteEditTab(e) {
    if (e.target.classList.contains('fa-trash-can')) {
      editForm.classList.add('hidden');
    }
  }

  //! Edit Worout Tab //
  _editWorkoutValues(e) {
    e.preventDefault();

    let workout;
    const id = this.#editWorkouts.id;
    for (let i = 0; i < this.#workouts.length; i++) {
      if (this.#workouts[i].id === id) {
        workout = this.#workouts[i];
      }
    }

    console.log(workout);
    const validInputs = (...inputs) =>
      inputs.every(inp => Number.isFinite(inp));

    const allPositive = (...inputs) => inputs.every(inp => inp > 0);

    //? Get data from the form
    const type = edit_inputType.value;
    const distance = +edit_inputDistance.value;
    const duration = +edit_inputDuration.value;
    //? if running: create new running object
    if (type === 'running') {
      Object.setPrototypeOf(workout, Running.prototype);

      const cadence = +edit_inputCadence.value;
      //* Check if data is valid
      if (
        !validInputs(distance, duration, cadence) ||
        !allPositive(distance, duration, cadence)
      ) {
        return alert('Inputs have to be positive numbers!');
      } else {
        Object.setPrototypeOf(workout, Running.prototype);
        workout.type = type;
        workout.distance = distance;
        workout.duration = duration;
        workout.cadence = cadence;
        workout.calcPace();
      }
    }

    //? if cycling: create cycing object
    if (type === 'cycling') {
      Object.setPrototypeOf(workout, Cycling.prototype);

      const elevation = +edit_inputElevation.value;
      //* Check if data is valid
      if (
        !validInputs(distance, duration, elevation) ||
        !allPositive(distance, duration)
      ) {
        return alert('Inputs have to be positive numbers!');
      } else {
        Object.setPrototypeOf(workout, Cycling.prototype);

        workout.type = type;
        workout.distance = distance;
        workout.duration = duration;
        workout.elevation = elevation;
        workout.calcSpeed();
      }
    }
    console.log(workout);
    this.#workouts.push(workout);
    this._deleteWorkout(id);

    workout.date = new Date(workout.date);
    workout._setDescription(workout);
    this._setLocalStorage();
    location.reload();
  }

  _editWorkout(e) {
    const workoutEl = e.target.closest('.workout');
    if (!workoutEl) return;

    const workout = this.#workouts.find(
      work => work.id === workoutEl.dataset.id
    );

    if (e.target.classList.contains('fa-pen-to-square')) {
      console.log('EDIT CLICKED');
      //* show/remove forms

      console.log(this.#workouts.length);
      form.classList.add('hidden');
      editForm.classList.add('hidden');

      editForm.classList.remove('hidden');
      document.getElementById('editForm__border').style.borderColor = 'red';
    }
    setTimeout(() => (form.style.display = 'grid'), 1000);
  }

  _moveToPopup(e) {
    const workoutEl = e.target.closest('.workout');
    if (!workoutEl) return;

    const workout = this.#workouts.find(
      work => work.id === workoutEl.dataset.id
    );
    this.#editWorkouts = workout;
    console.log(workout);

    //* Remove workout
    if (e.target.classList.contains('fa-trash-can')) {
      workoutEl.remove();

      let workoutId = e.target.closest('.workout').dataset.id;
      this._deleteWorkout(workoutId);
    }
    console.log(this.#city);

    //* Select correct editing type
    if (workout.type === 'running') {
      document.getElementById('transport').value = 'running';

      if (workout.type === 'running') {
        edit_inputElevation
          .closest('.form__row')
          .classList.add('form__row--hidden');
        edit_inputCadence
          .closest('.form__row')
          .classList.remove('form__row--hidden');
      }
    } else {
      if (workout.type === 'cycling') {
        document.getElementById('transport').value = 'cycling';

        if (workout.type === 'cycling') {
          edit_inputElevation
            .closest('.form__row')
            .classList.remove('form__row--hidden');
          edit_inputCadence
            .closest('.form__row')
            .classList.add('form__row--hidden');
        }
      }
    }
    //*Move to marker on click
    this.#map.flyTo(workout.coords, this.#mapZoomLevel, {
      animate: true,
      pan: {
        duration: 1,
      },
    });
  }

  _setLocalStorage() {
    localStorage.setItem('workouts', JSON.stringify(this.#workouts));
  }

  _getLocalStorage() {
    const data = JSON.parse(localStorage.getItem('workouts'));

    if (!data) return;
    //* Loop through array and set either running or cycling prototype
    this.#workouts = data;

    this.#workouts.forEach(work => {
      work.__proto__ =
        work.type === 'running' ? Running.prototype : Cycling.prototype;
      this._renderWorkout(work);
    });
  }

  reset() {
    localStorage.removeItem('workouts');
    location.reload();
  }
}
const app = new App();
