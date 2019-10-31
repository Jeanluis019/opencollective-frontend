import React from 'react';
import PropTypes from 'prop-types';
import { FormControl } from 'react-bootstrap';
import { defineMessages, injectIntl } from 'react-intl';
import CollectivePickerAsync from './CollectivePickerAsync';

const messages = defineMessages({
  addFundsFromHost: {
    id: 'addfunds.fromCollective.host',
    defaultMessage: 'Host ({host})',
  },
});

class AddFundsSourcePicker extends React.Component {
  static propTypes = {
    host: PropTypes.object,
    onChange: PropTypes.func,
    intl: PropTypes.object.isRequired,
  };

  onChange = option => {
    if (option.value === 'other') {
      this.props.onChange('other');
    } else {
      this.props.onChange(option.value.id);
    }
  };

  render() {
    const { intl, host } = this.props;
    const customOptions = [
      { value: { id: host.id }, label: intl.formatMessage(messages.addFundsFromHost, { host: host.name }) },
    ];

    return (
      <CollectivePickerAsync
        id="sourcePicker"
        onChange={this.onChange}
        maxMenuHeight={200}
        getDefaultOptions={() => customOptions[0]}
        customOptions={customOptions}
        types={['USER', 'ORGANIZATION']}
      />
    );
  }
}

class AddFundsSourcePickerForUser extends React.Component {
  static propTypes = {
    onChange: PropTypes.func,
    LoggedInUser: PropTypes.object.isRequired,
  };

  constructor(props) {
    super(props);
    this.state = { loading: true };
  }

  onChange = async e => {
    this.props.onChange(e.target.value);
  };

  render() {
    const hosts = this.props.LoggedInUser.hostsUserIsAdminOf();
    return (
      <div>
        <FormControl
          id="sourcePicker"
          name="template"
          componentClass="select"
          placeholder="select"
          onChange={this.onChange}
        >
          <option value="" key="addfsph-00" />
          {hosts.map(h => (
            <option value={h.id} key={`addfsph-${h.id}`}>
              {h.name}
            </option>
          ))}
        </FormControl>
      </div>
    );
  }
}

export const AddFundsSourcePickerWithData = injectIntl(AddFundsSourcePicker);
export const AddFundsSourcePickerForUserWithData = injectIntl(AddFundsSourcePickerForUser);

// for testing
export const MockAddFundsSourcePicker = injectIntl(AddFundsSourcePicker);
export const MockAddFundsSourcePickerForUser = injectIntl(AddFundsSourcePickerForUser);

export default AddFundsSourcePickerWithData;
