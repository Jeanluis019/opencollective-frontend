import React from 'react';
import PropTypes from 'prop-types';
import { useIntl, defineMessages } from 'react-intl';
import { Box } from '@rebass/grid';
import { pick } from 'lodash';
import { useMutation } from 'react-apollo';
import gql from 'graphql-tag';
import useForm from 'react-hook-form';

import { getErrorFromGraphqlException } from '../lib/utils';
import { CollectiveType } from '../lib/constants/collectives';
import { H5 } from './Text';
import StyledInputField from './StyledInputField';
import StyledInput from './StyledInput';
import Container from './Container';
import StyledButton from './StyledButton';
import MessageBox from './MessageBox';

const CreateNewMessages = defineMessages({
  [CollectiveType.COLLECTIVE]: {
    id: 'Collective.CreateNew',
    defaultMessage: 'Create new Collective',
  },
  [CollectiveType.USER]: {
    id: 'User.CreateNew',
    defaultMessage: 'Create new user',
  },
  [CollectiveType.EVENT]: {
    id: 'Event.CreateNew',
    defaultMessage: 'Create new event',
  },
  [CollectiveType.ORGANIZATION]: {
    id: 'Organization.CreateNew',
    defaultMessage: 'Create new Organization',
  },
});

const msg = defineMessages({
  emailTitle: {
    id: 'EditUserEmailForm.title',
    defaultMessage: 'Email address',
  },
  name: {
    id: 'Collective.Name',
    defaultMessage: 'Name',
  },
  fullName: {
    id: 'User.FullName',
    defaultMessage: 'Full name',
  },
  website: {
    id: 'collective.website.label',
    defaultMessage: 'Website',
  },
  cancel: {
    id: 'cancel',
    defaultMessage: 'Cancel',
  },
  save: {
    id: 'save',
    defaultMessage: 'Save',
  },
  invalidEmail: {
    id: 'error.email.invalid',
    defaultMessage: 'Invalid email address',
  },
  invalidWebsite: {
    id: 'error.website.invalid',
    defaultMessage: 'Invalid website address',
  },
  invalidName: {
    id: 'error.name.invalid',
    defaultMessage: 'Name is required',
  },
});

/** Prepare mutation variables based on collective type */
const prepareMutationVariables = collective => {
  if (collective.type === CollectiveType.USER) {
    return { user: pick(collective, ['name', 'email']) };
  } else {
    return { collective: pick(collective, ['name', 'type', 'website']) };
  }
};

const CreateCollectiveMutation = gql`
  mutation CreateCollective($collective: CollectiveInputType!) {
    createCollective(collective: $collective) {
      id
      name
      slug
      type
      imageUrl(height: 64)
    }
  }
`;

const CreateUserMutation = gql`
  mutation CreateUser($user: UserInputType!) {
    createUser(user: $user, throwIfExists: false, sendSignInLink: false) {
      user {
        id
        collective {
          id
          name
          slug
          type
          imageUrl(height: 64)
          ... on User {
            email
          }
        }
      }
    }
  }
`;

/**
 * A mini-form to create collectives/orgs/users. Meant to be embed in popups or
 * small component where we want to provide just the essential fields.
 */
const CreateCollectiveMiniForm = ({ type, onCancel, onSuccess }) => {
  const isUser = type === CollectiveType.USER;
  const isCollective = type === CollectiveType.COLLECTIVE;
  const mutation = isUser ? CreateUserMutation : CreateCollectiveMutation;
  const [createCollective, { error: submitError }] = useMutation(mutation);
  const { handleSubmit, register, formState, errors } = useForm({ mode: 'onBlur' });
  const { formatMessage } = useIntl();

  return (
    <form
      onSubmit={handleSubmit(formData =>
        createCollective({ variables: prepareMutationVariables({ ...formData, type }) }).then(({ data }) => {
          return onSuccess(isUser ? data.createUser.user.collective : data.createCollective);
        }),
      )}
    >
      <H5 fontWeight={600}>{CreateNewMessages[type] ? formatMessage(CreateNewMessages[type]) : null}</H5>
      <Box mt={3}>
        {isUser && (
          <StyledInputField
            htmlFor="email"
            label={formatMessage(msg.emailTitle)}
            error={errors.email && formatMessage(msg.invalidEmail)}
            mt={3}
          >
            {inputProps => (
              <StyledInput
                {...inputProps}
                type="email"
                width="100%"
                placeholder="i.e. john-smith@youremail.com"
                ref={register({ required: true })}
              />
            )}
          </StyledInputField>
        )}
        <StyledInputField
          autoFocus
          htmlFor="name"
          label={formatMessage(isUser ? msg.fullName : msg.name)}
          error={errors.name && formatMessage(msg.invalidName)}
          mt={3}
        >
          {inputProps => (
            <StyledInput
              {...inputProps}
              ref={register({ required: true })}
              width="100%"
              placeholder={
                isUser ? 'i.e. John Doe, Frank Zappa' : isCollective ? 'i.e. Webpack, Babel' : 'i.e. AirBnb, TripleByte'
              }
            />
          )}
        </StyledInputField>
        {!isUser && (
          <StyledInputField
            htmlFor="website"
            label={formatMessage(msg.website)}
            error={errors.website && formatMessage(msg.invalidWebsite)}
            mt={3}
          >
            {inputProps => (
              <StyledInput {...inputProps} placeholder="i.e. opencollective.com" width="100%" ref={register} />
            )}
          </StyledInputField>
        )}
      </Box>
      {submitError && (
        <MessageBox type="error" withIcon mt={2}>
          {getErrorFromGraphqlException(submitError).message}
        </MessageBox>
      )}
      <Container display="flex" flexWrap="wrap" justifyContent="flex-end" borderTop="1px solid #D7DBE0" mt={4} pt={3}>
        <StyledButton mr={2} minWidth={100} onClick={() => onCancel()} disabled={formState.isSubmitting}>
          {formatMessage(msg.cancel)}
        </StyledButton>
        <StyledButton
          type="submit"
          buttonStyle="primary"
          minWidth={100}
          disabled={!formState.isValid}
          loading={formState.isSubmitting}
        >
          {formatMessage(msg.save)}
        </StyledButton>
      </Container>
    </form>
  );
};

CreateCollectiveMiniForm.propTypes = {
  /** The collective type to create */
  type: PropTypes.oneOf(Object.values(CollectiveType)).isRequired,
  /** Called when cancel is clicked */
  onCancel: PropTypes.func.isRequired,
  /** Called with the collective created when the function succeed */
  onSuccess: PropTypes.func.isRequired,
};

export default CreateCollectiveMiniForm;
