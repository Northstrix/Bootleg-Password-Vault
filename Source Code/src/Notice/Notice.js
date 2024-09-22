import React, { useState } from 'react';
import './Notice.css';

const Disclaimer = ({ onAccept }) => {
  const [isChecked, setIsChecked] = useState(false);

  const handleCheckboxChange = () => {
    setIsChecked(!isChecked);
  };

  const handleButtonClick = () => {
    if (isChecked) {
      onAccept();
    }
  };

  return (
    <div className="disclaimer-container">
      <h2>IMPORTANT NOTICE</h2>
      <p>
        Despite having well-functioning cryptographic primitives, this web app (service) may not be reliable. 
        This app is designed for educational and demonstration purposes only!
      </p>
      <strong>
      <p>
        This application is provided with no warranty or guarantees of any kind.
      </p>
      <p>
        It may contain undiscovered vulnerabilities or errors.
      </p>
      </strong>
      <p>
        This app can become non-functional at any time or be taken down at any moment without any prior notice.
      </p>
      <p className="warning">USE IT AT YOUR OWN RISK!!!</p>
      <div className="normalButton">
        <input
          type="checkbox"
          id="nb-check"
          checked={isChecked}
          onChange={handleCheckboxChange}
        />
        <label htmlFor="nb-check" className="normalButton__check">
          I understand, and I'm OK with that
        </label>
        <button onClick={handleButtonClick} className="normalButton__button">
          {isChecked ? 'Continue' : 'Read the notice first'}
        </button>
      </div>
    </div>
  );
};

export default Disclaimer;