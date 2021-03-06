/* eslint-disable import/no-extraneous-dependencies */
import React from 'react';
import PropTypes from 'prop-types';
import ReactMarkdown from 'react-markdown';
import PrettyPropType from '@storybook/addon-info/dist/components/types/PrettyPropType';
import Code from './Code';

const TableComponent = ({ propDefinitions }) => {
  const source = propDefinitions
    .filter(({ property }) => property !== 'children')
    .map(({
      property, propType, required, description, defaultValue,
    }) => `${`- *${property} ${required ? '' : '?'}*`
          + ` - @@${JSON.stringify(propType)}@@`}${
      defaultValue && defaultValue !== 'undefined' ? ` - \`${defaultValue}\`` : ''
    }${description ? `\n\n  ${description}\n` : ''}`).join('\n');
  return (
    <ReactMarkdown
      source={source}
      renderers={{
        text: (value, key) => {
          const reg = /@@[\s\S]*@@/g;
          let res;
          const out = [];
          let pos = 0;
          let i = 0;
          // eslint-disable-next-line
          while (res = reg.exec(value)) {
            if (res.index > pos) {
              out.push(value.slice(pos, res.index));
            }
            out.push(<PrettyPropType key={`${i++}`} propType={JSON.parse(res[0].slice(2, res[0].length - 2))} />);
            pos = res.index + res[0].length;
          }
          if (pos < value.length) {
            out.push(value.slice(pos, value.length));
          }
          if (out.length === 0) {
            return null;
          } else if (out.length === 1) {
            return out[0];
          }
            return (
              <span key={key}>
                { out }
              </span>
            );
        },
        code: Code,
      }}
    />
  );
};

// noinspection JSUnresolvedFunction, JSUnresolvedVariable
TableComponent.propTypes = {
  propDefinitions: PropTypes.arrayOf(PropTypes.object).isRequired,
};

export default TableComponent;
