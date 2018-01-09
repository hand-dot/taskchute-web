import React from 'react';
import PropTypes from 'prop-types';
import TextField from 'material-ui/TextField';

function DatePicker(props) {
  const { value, changeDate, label } = props;
  return (
    <form
      noValidate
      style={{ display: 'inline' }}
    >
      <TextField
        id="date"
        label={label}
        type="date"
        value={value}
        onChange={changeDate}
        InputLabelProps={{
          shrink: true,
        }}
      />
    </form>
  );
}

DatePicker.propTypes = {
  value: PropTypes.string.isRequired,
  changeDate: PropTypes.func.isRequired,
  label: PropTypes.string.isRequired,
};

DatePicker.defaultProp = {
  label: '',
};

export default DatePicker;
